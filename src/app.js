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
    const urlRegex = new RegExp("(?<protocol>https?)://(?<hostname>[A-Za-z.0-9]*)/?:?(?<port>d*)", "g")
    const urlMatch = urlRegex.exec(config.site_url || "")
    if (!urlMatch) return logger.error("Server URL regex is invalid")

    const protocol = urlMatch.groups?.protocol ? urlMatch.groups.protocol : "http"

    const hostname = urlMatch.groups?.hostname ? urlMatch.groups.hostname : "localhost"

    const port = urlMatch.groups?.port ? urlMatch.groups.port : 8080

    if (protocol.includes("https")) {
        sessionEnvironment.cookie.secure = true
        logger.log("Using secure cookies")
    }

    initExpressRouter()
    logger.log(`Connecting to database (mongo)`)
    try {
        await connect(config.mongo_uri || "")
        logger.log(`Database connected, continuing`)
    } catch (err) {
        logger.error(err)
    }

    logger.log(`Starting server....`)
    initExpressRouter().listen(port, async () => logger.log(`Server listening at ${protocol}://${hostname}:${port}`))
}

;(async () => await setupServer())()
