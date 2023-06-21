import { sha256 } from "js-sha256"
import { readFile } from "fs/promises"
import { RequestHandler, Router } from "express"
import { ModelOperations } from "@vscode/vscode-languagedetection"
import { hash } from "bcrypt"

import config from "../config"
import { createAccountLimiter, loginAccountLimiter } from "../ratelimiters/users"
import { makeid } from "../helpers"
import { Routes } from "./router"

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
        this.router.post("/login", loginAccountLimiter, this.newUser.bind(this)) // Create a new paste
    }

    sendPasteNotFoundResponse(res: RequestParams[1]) {
        return this.sendErrorResponse(
            res,
            404,
            "Käyttäjää ei löytynyt",
            "Olemme pahoillamme, mutta hakemaasi liitettä ei löytynyt."
        )
    }

    async newUser(req: RequestParams[0], res: RequestParams[1]) {
        if (!config.allow_registrations)
            return this.sendErrorResponse(
                res,
                403,
                "Rekisteröinti epäonnistui",
                "Rekisteröintejä ei oteta tällä hetkellä vastaan."
            )

        const body = await req.body
        if (!body || !body.username || !body.password || !body.email)
            return this.sendErrorResponse(res, 400, "Pyynnön vartalo on pakollinen", "Et voi luoda tyhjää pyyntöä.")

        const username = body.username
        const password = body.password

        // Run checks
        const usernameRegex = /^[a-z]{1}[a-z_0-9-]{0,18}[a-z]{1}$/
        if (!usernameRegex.test(username)) {
            return this.sendErrorResponse(
                res,
                400,
                "Virheellinen käyttäjänimi",
                "Käyttäjänimen tulee koostua 3-20 merkistä ja kirjaimista a-z, numeroista 0-9, erikoismerkeistä '_, -' ja alkaa kirjaimella a-z."
            )
        }

        if (password.length < 8)
            return this.sendErrorResponse(res, 400, "Virheellinen salasana", "Salasanan tulee olla väh. 8 merkkiä.")

        const email = body.email
        if (!validateEmail(email))
            return this.sendErrorResponse(
                res,
                400,
                "Virheellinen sähköpostiosoite",
                "Sähköpostiosoite on virheellinen, joten käyttäjää ei luotu."
            )

        if (await this.UserModel.exists({ name: username }))
            return this.sendErrorResponse(
                res,
                409,
                "Käyttäjä on jo olemassa",
                "Luotu käyttäjä on jo olemassa, joten sitä ei luotu."
            )

        const passwordHashed = await hash(password, 12)
        const user = {
            name: username,
            password: passwordHashed,
            email: email,
            ip: { last: req.ip.toString(), all: [req.ip.toString()] },
        }

        this.UserModel.create(user, (err, user) => {
            if (err) {
                this.logger.log(err)
                this.sendErrorResponse(
                    res,
                    500,
                    "Käyttäjää ei voitu luoda",
                    "Jotain meni vikaan, eikä käyttäjää luotu."
                )
            }
            this.logger.log(`${req.ip} - ${Date.now().toString()} - New user created: '${user.name}'`)
        })

        res.send({
            username: username,
        })
    }
}

export { Users }
