import { checkReputation } from "../helpers.js"
import { Logger } from "../utils/logger.js"
import { PasteSchema } from "../schemas.js"
import { model } from "mongoose"
import config from "../config.js"

class Routes {
    constructor() {
        this.criticalLogger = new Logger(true, true)
        this.logger = new Logger(true, false)
        this.PasteModel = model("Paste", PasteSchema)
        this.unknown_author = config.unknown_author || {
            name: "Tuntematon",
            avatar: "https://images.unsplash.com/photo-1534294668821-28a3054f4256?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
        }

        if (!this.PasteModel) this.criticalLogger.error(`Unable to initialize PasteModel`)
    }

    sendErrorResponse(res, status, title, message, additionalfields) {
        let rsjson = {
            title: title,
            message: message,
            data: {},
        }
        additionalfields.map((key, value) => {
            rsjson.data[key] = value
        })

        return res.status(status).send()
    }

    async checkClientReputation(req, res) {
        if (!config.abuseipdb_key) return

        const reputation = JSON.parse(await checkReputation(req.ip, config.abuseipdb_key))

        if ("errors" in reputation) {
            reputation.errors.forEach((error) => {
                this.logger.error("AbuseIPDB", error)
            })
        } else {
            if (reputation.data.abuseConfidenceScore > 60) {
                return this.sendErrorResponse(
                    res,
                    403,
                    "Pääsy hylätty",
                    "IP-osoitteesi maine on huono, joten hylkäsimme pyyntösi uuden liitteen luomiseksi."
                )
            }
        }
    }
}

export { Routes }
