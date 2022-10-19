import express, { urlencoded, json } from "express"
import session from "express-session"

import { Logger } from "./utils/logger.js"
import { connect } from "mongoose"
import config from "./config.js"
import Pastes from "./routes/paste.js"
import { General } from "./routes/general.js"

const logger = new Logger(true, true)

let sessionEnvironment = {
    secret: config.secret || "",
    cookie: {},
    resave: true,
    saveUninitialized: true,
}

function initExpressRouter() {
    const app = express()

    app.use("/", new General().router)
    app.use("/pastes", new Pastes().router)

    //TODO: don't use hardcoded values
    app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"])
    app.use(session(sessionEnvironment))
    app.set("view engine", "ejs")

    app.use(urlencoded({ extended: true, limit: "10mb" }))
    app.use(json({ limit: "10mb" }))

    return app
}

async function setupServer() {
    const urlRegex = new RegExp("(?<pr>https?)://(?<h>[A-Za-z.0-9]*)/?:?(?<po>d*)", "g")
    const urlMatch = urlRegex.exec(config.site_url || "")
    if (!urlMatch) return logger.error("Server URL regex is invalid")

    const serverListenerProperties = {
        protocol: urlMatch.groups?.pr ? urlMatch.groups.pr : "http",
        hostname: urlMatch.groups?.h ? urlMatch.groups.h : "localhost",
        port: urlMatch.groups?.po ? urlMatch.groups.po : 8080,
        display: () => `${this.protocol}://${this.hostname}:${this.hostname}`,
    }

    if (serverListenerProperties.protocol.includes("https")) {
        sessionEnvironment.cookie.secure = true
        logger.log("Using secure cookies")
    }

    logger.log(`Connecting to database (mongo)`)
    try {
        await connect(config.mongo_uri || "")
        logger.log(`Database connected, continuing`)
    } catch (err) {
        logger.error(err)
    }

    logger.log(`Starting server....`)
    initExpressRouter().listen(serverListenerProperties.display(), async () =>
        logger.log(`Server listening at ${serverListenerProperties.display()}`)
    )
}

;(async () => await setupServer())()
