import { RequestHandler, Router } from "express"
import { ModelOperations } from "@vscode/vscode-languagedetection"
import { hash, compare } from "bcrypt"

import config from "../config"
import { createAccountLimiter, loginAccountLimiter } from "../ratelimiters/users"
import { Routes } from "./router"
import { randomUUID } from "crypto"
import { errors, userErrors } from "./errors"
import { setDefaultResultOrder } from "dns"

const modulOperations = new ModelOperations()

type RequestParams = Parameters<RequestHandler>

function validateEmail(email: string) {
    const re =
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(email)
}

class Users extends Routes {
    router: Router

    constructor() {
        super()

        this.router = Router()
        this.router.use(this.checkClientReputation.bind(this))
        this.router.post("/create", createAccountLimiter, this.newUser.bind(this))
        this.router.post("/login", loginAccountLimiter, this.login.bind(this))
        this.router.post("/update", this.updateAccount.bind(this))

        this.router.get("/session", this.listSessions.bind(this))
        this.router.delete("/session", this.removeSession.bind(this))
    }

    async requireAuthentication(req: RequestParams[0]) {
        let sessionMetadata = {
            user: "",
            token: "",
        }

        try {
            const session: string = req.cookies?.["session-token"]
            sessionMetadata.user = Buffer.from(session.split(":")[0], "base64").toString()
            sessionMetadata.token = session.split(":")[1]
        } catch (e) {
            return undefined
        }

        const user = await this.UserModel.findOne({ user: sessionMetadata.user }).exec()
        if (!user) return undefined

        const sessionIndex = user.sessions.findIndex((s) => s.token == sessionMetadata.token)
        if (sessionIndex == -1) return undefined

        user.sessions[sessionIndex].lastLogin = Date.now()
        await user.save()

        return {
            session: sessionMetadata,
            user,
        }
    }

    async newUser(req: RequestParams[0], res: RequestParams[1]) {
        if (!config.allow_registrations) return this.sendErrorResponse(res, 403, userErrors.registrationFailed)

        const registeredAt = parseInt(req.cookies?.["registered_at"])
        if (registeredAt !== 0 && registeredAt - 3600 * 24)
            return this.sendErrorResponse(res, 401, userErrors.registrationFailedRatelimit)

        const body = await req.body
        if (!body || !body.username || !body.password || !body.email)
            return this.sendErrorResponse(res, 400, userErrors.invalidBody)

        const username = body.username
        const password = body.password

        // Run checks
        const usernameRegex = /^[a-z]{1}[a-z_0-9-]{0,18}[a-z]{1}$/
        if (!usernameRegex.test(username)) return this.sendErrorResponse(res, 400, userErrors.invalidUsername)
        if (password.length < 8) return this.sendErrorResponse(res, 400, userErrors.invalidPassword)

        const email = body.email
        if (!validateEmail(email)) return this.sendErrorResponse(res, 400, userErrors.invalidEmail)

        if (await this.UserModel.exists({ name: username }))
            return this.sendErrorResponse(res, 409, userErrors.userAlreadyExists)

        const passwordHashed = await hash(password, 12)
        const user = {
            name: username,
            password: passwordHashed,
            email: email,
            ip: { last: req.ip.toString(), all: [req.ip.toString()] },
        }

        try {
            await this.UserModel.create(user)
        } catch (e) {
            return this.sendErrorResponse(res, 500, userErrors.invalidBody)
        }

        this.logger.log(`${req.ip} - ${Date.now().toString()} - New user created: '${user.name}'`)
        res.cookie("registered_at", Date.now(), { httpOnly: true }).send({
            username: username,
        })
    }

    async login(req: RequestParams[0], res: RequestParams[1]) {
        const sessionCreated = {
            message: "New session created",
        }

        const identity = await this.requireAuthentication(req)
        if (identity) return res.send(sessionCreated)

        const body = await req.body
        if (!body || !body.username || !body.password) return this.sendErrorResponse(res, 401, userErrors.invalidBody)

        const session = {
            token: randomUUID(),
            ip: req.ip,
            lastLogin: Date.now(),
            initializedAt: Date.now(),
        }

        const user = await this.UserModel.findOne({ name: body.username }).exec()
        if (!user) return this.sendErrorResponse(res, 400, userErrors.userNotFound)
        if (!compare(user.password, body.password)) return this.sendErrorResponse(res, 401, userErrors.loginFailed)

        const update = await this.UserModel.updateOne({ name: body.username }, { $push: { sessions: session } })
        if (!update.acknowledged) {
            return this.sendErrorResponse(res, 500, errors.internal)
        }

        const usernameBase64d = Buffer.from(body.username).toString("base64")
        res.cookie("session-token", `${usernameBase64d}:${session.token}`, { httpOnly: true }).send(sessionCreated)
    }

    async listSessions(req: RequestParams[0], res: RequestParams[1]) {
        const identity = await this.requireAuthentication(req)
        if (!identity) return this.sendErrorResponse(res, 401, userErrors.invalidBody)

        res.send(
            identity.user.sessions.map((session) => {
                return {
                    token: session.token,
                    ip: session.ip,
                    lastLogin: session.lastLogin,
                    initializedAt: session.initializedAt,
                    current: session.token === identity.session.token,
                }
            })
        )
    }

    async removeSession(req: RequestParams[0], res: RequestParams[1]) {
        const body = await req.body
        const sessionIdToRemove = body.session
        const password = body.password

        if (!sessionIdToRemove || !password) return this.sendErrorResponse(res, 400, userErrors.invalidBody)
        const identity = await this.requireAuthentication(req)
        if (!identity) return this.sendErrorResponse(res, 401, userErrors.invalidBody)

        if (!(await compare(password, identity.user.password)))
            return this.sendErrorResponse(res, 401, userErrors.loginFailed)

        const sessionAmount = identity.user.sessions.length
        identity.user.sessions = identity.user.sessions.filter((v) => v.token !== sessionIdToRemove)
        await identity.user.save()
        const afterSessionAmount = identity.user.sessions.length

        res.status(sessionAmount > afterSessionAmount ? 200 : 400).send(
            sessionAmount > afterSessionAmount ? "Session deleted" : userErrors.sessionNotFound
        )
    }

    async updateAccount(req: RequestParams[0], res: RequestParams[1]) {
        const body = await req.body
        const updateable = body.updateable
        const password = body.password
        if (!updateable || !password) return this.sendErrorResponse(res, 400, userErrors.invalidBody)

        const identity = await this.requireAuthentication(req)
        if (!identity) return this.sendErrorResponse(res, 401, userErrors.invalidBody)

        if (!(await compare(password, identity.user.password)))
            return this.sendErrorResponse(res, 401, userErrors.loginFailed)

        if (updateable["bio"]?.length <= 200) {
            identity.user.meta.bio = updateable["bio"]
        }
        if (updateable["email"]) {
            const email = updateable["email"]
            if (!validateEmail(email)) return this.sendErrorResponse(res, 400, userErrors.invalidEmail)
            identity.user.email = email
        }
        if (updateable["pic"]) {
            const allowedPicUrls = ["avatars.githubusercontent.com"]
            const url = new URL(updateable["pic"])
            if (!url) return this.sendErrorResponse(res, 400, userErrors.invalidBody)
            if (allowedPicUrls.includes(url.hostname)) {
                identity.user.meta.pic = url
            } else {
                return this.sendErrorResponse(res, 400, userErrors.invalidPicUrl)
            }
        }

        await identity.user.save()

        res.status(200).send({
            message: "Profile was saved",
            updated: updateable,
        })
    }
}

export { Users }
