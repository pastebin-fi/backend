import { RequestHandler, Router } from "express"
import { hash, compare } from "bcrypt"

import config from "../config"
import { createAccountLimiter, loginAccountLimiter } from "../ratelimiters/users"
import { Routes } from "./router"
import { randomUUID } from "crypto"
import { errors, userErrors } from "./errors"
import { makeid } from "../helpers"

type RequestParams = Parameters<RequestHandler>

function validateEmail(email: string | undefined) {
    const re =
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(email || "")
}

class Users extends Routes {
    router: Router

    constructor() {
        super()

        this.router = Router()
        this.router.use(this.checkClientReputation.bind(this))
        this.router.get("/me", this.info.bind(this))
        this.router.post("/create", createAccountLimiter, this.newUser.bind(this))
        this.router.post("/login", loginAccountLimiter, this.login.bind(this))
        this.router.post("/update", this.updateAccount.bind(this))
        this.router.post("/resend-mail", this.resendEmail.bind(this))
        this.router.post("/activate", this.activateUser.bind(this))
        this.router.delete("/", this.deleteAccount.bind(this))

        this.router.get("/session", this.listSessions.bind(this))
        this.router.delete("/session", this.removeSession.bind(this))
        this.router.get("/logout", this.logout.bind(this))
    }

    async info(req: RequestParams[0], res: RequestParams[1]) {
        const identity = await this.requireAuthentication(req)
        if (!identity) return this.sendErrorResponse(res, 401, userErrors.authenticationRequired)

        res.send({
            username: identity.user.name,
            email: identity.user.email,
            activated: identity.user.activated,
            banned: identity.user.banned,
            meta: identity.user.meta,
        })
    }

    async sendVerificationEmail(mail: string, activationKey: string) {
        try {
            this.UserModel.updateOne({ email: mail }, { lastSentActivation: Date.now() })

            const mailer = await this.mailer
            await mailer.sendMail({
                from: `"Email verification" <${process.env.MAIL_USER}>`,
                to: mail,
                subject: "Complete your signup to pastebin.fi",
                text: `Hi! Thank you for signing up to https://pastebin.fi. Use the following key to complete your signup: ${activationKey}`,
            })
            this.logger.log("Email sent to:", mail)
            return true
        } catch (e) {
            this.logger.warn("Email failed to send:", e)
            return false
        }
    }

    async resendEmail(req: RequestParams[0], res: RequestParams[1]) {
        const body = await req.body
        const name = body.username

        const user = await this.UserModel.findOne({ name }).exec()
        if (!user) return this.sendErrorResponse(res, 404, userErrors.userNotFound)
        const email = user.email

        const id = makeid(32)
        if (!(await this.sendVerificationEmail(email, id)))
            return res.status(500).send({
                message: "Verification email failed to send",
            })
        return res.status(200).send({
            message: "Verification email was sent.",
        })
    }

    timeOver(seconds: number, timestamp: Date) {
        const ms = Date.now() - timestamp.getTime()
        return ms / 1000 > seconds
    }

    async activateUser(req: RequestParams[0], res: RequestParams[1]) {
        const identity = await this.requireAuthentication(req)
        if (identity) return this.sendErrorResponse(res, 403, userErrors.userAlreadyLoggedIn)

        const body = await req.body
        const activationkey = body.activationkey
        const name = body.username

        const user = await this.UserModel.findOne({ name }).exec()
        if (!user) return this.sendErrorResponse(res, 404, userErrors.userNotFound)

        const indexOf = user?.activations.findIndex((key) => key.id === activationkey)
        if (indexOf === undefined || indexOf == -1) return this.sendErrorResponse(res, 403, userErrors.invalidKey)

        if (this.timeOver(3600, user.activations[indexOf].createdAt))
            return this.sendErrorResponse(res, 403, userErrors.invalidKey)

        user.activated = true
        user.activations = user.activations.filter((k) => k.id !== activationkey)
        await user.save()

        res.status(200).send()
    }

    async newUser(req: RequestParams[0], res: RequestParams[1]) {
        if (!config.allow_registrations) return this.sendErrorResponse(res, 403, userErrors.registrationFailed)

        const identity = await this.requireAuthentication(req)
        if (identity) return this.sendErrorResponse(res, 403, userErrors.userAlreadyLoggedIn)

        const registeredAt = parseInt(req.cookies?.["registered_at"])
        if (!config.skipRatelimiters && registeredAt !== 0 && registeredAt - 3600 * 24)
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
            activations: [{ id: makeid(32) }],
            activated: !config.mailerEnabled,
            email: email,
            ip: { last: req.ip.toString(), all: [req.ip.toString()] },
        }

        if (config.mailerEnabled) {
            await this.sendVerificationEmail(email, user.activations[0].id)
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

        if (!user.activated) return this.sendErrorResponse(res, 403, userErrors.notActivated)
        if (!compare(user.password, body.password)) return this.sendErrorResponse(res, 403, userErrors.loginFailed)

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

        const wasDeleted = sessionAmount > afterSessionAmount

        res.send({ message: wasDeleted ? "Session deleted" : "Session didn't exist" })
    }

    async logout(req: RequestParams[0], res: RequestParams[1]) {
        const identity = await this.requireAuthentication(req)
        if (!identity) return this.sendErrorResponse(res, 401, userErrors.invalidBody)

        const sessionIdToRemove = identity.session.token
        identity.user.sessions = identity.user.sessions.filter((v) => v.token !== sessionIdToRemove)
        await identity.user.save()

        res.send({ message: "Session deleted" })
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

    async deleteAccount(req: RequestParams[0], res: RequestParams[1]) {
        const body = await req.body
        const password = body.password
        if (!password) return this.sendErrorResponse(res, 400, userErrors.invalidBody)

        const identity = await this.requireAuthentication(req)
        if (!identity) return this.sendErrorResponse(res, 401, userErrors.invalidBody)

        if (!(await compare(password, identity.user.password)))
            return this.sendErrorResponse(res, 401, userErrors.loginFailed)

        try {
            await identity.user.deleteOne()
        } catch (e) {
            return this.sendErrorResponse(res, 400, errors.internal)
        }

        res.status(200).send({
            message: "Your account was deleted",
            one_more_message: "Sorry to see you go!",
        })
    }
}

export { Users }
