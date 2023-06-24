import { checkReputation } from "../helpers"
import { Logger } from "../utils/logger"
import { PasteSchema, UserSchema } from "../schemas"
import { Model, model } from "mongoose"
import config from "../config"
import { RequestHandler } from "express"
import { CustomError, userErrors } from "./errors"
import { Transporter } from "nodemailer"
import SMTPTransport from "nodemailer/lib/smtp-transport"

type RequestParams = Parameters<RequestHandler>

class Routes {
    criticalLogger?: Logger
    logger?: Logger
    PasteModel: Model<any>
    UserModel: Model<any>
    unknown_author: {
        name: string
        avatar: string
    }
    mailer: Promise<Transporter<SMTPTransport.SentMessageInfo>>

    constructor() {
        this.criticalLogger = new Logger(true, true)
        this.logger = new Logger(true, false)
        this.PasteModel = model("Paste", PasteSchema)
        this.UserModel = model("User", UserSchema)
        this.mailer = config.getMailer()
        this.unknown_author = config.unknown_author || {
            name: "Tuntematon",
            avatar: "https://images.unsplash.com/photo-1534294668821-28a3054f4256?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
        }

        if (!this.PasteModel) this.criticalLogger.error(`Unable to initialize PasteModel`)
    }

    sendErrorResponse(res: any, status: number, err: CustomError, additionalfields?: {}) {
        return res.status(status).send({
            title: err.error,
            message: err.message,
            data: additionalfields,
        })
    }

    async checkClientReputation(req: RequestParams[0], res: RequestParams[1], next) {
        if (config.abuseipdb_key) {
            const reputation = JSON.parse(await checkReputation(req.ip, config.abuseipdb_key))

            if ("errors" in reputation) {
                reputation.errors.forEach((error: string) => {
                    this.logger?.error("AbuseIPDB", error)
                })
            } else {
                if (reputation.data.abuseConfidenceScore > 60) return this.sendErrorResponse(res, 403, userErrors.badIP)
            }
        }
        next()
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
}

export { Routes }
