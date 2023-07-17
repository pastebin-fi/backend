import express, { urlencoded, json } from "express"
import session from "express-session"
import { readFileSync } from "fs"
import swaggerUi from "swagger-ui-express"
import { connect } from "mongoose"
import { Logger } from "./utils/logger"
import config from "./config"
import Pastes from "./routes/paste"
import { General } from "./routes/general"
import { Metrics } from "./routes/metrics"
import { Routes } from "./routes/router"
import { Users } from "./routes/user"
import cors from "cors"

require("dotenv").config()

const swaggerDocument: object = JSON.parse(readFileSync(config.openapiFile, "utf8"))

const logger = new Logger(true, true)

let sessionEnvironment = {
    secret: config.secret || "",
    cookie: {
        secure: false,
    },
    resave: true,
    saveUninitialized: true,
}

async function initExpressRouter() {
    const app = express()

    //TODO: don't use hardcoded values
    app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"])
    app.use(session(sessionEnvironment))
    app.set("view engine", "ejs")

    app.use(urlencoded({ extended: true, limit: "10mb" }))
    app.use(json({ limit: "10mb" }))
    app.use(require("cookie-parser")())
    
    if (config.corsEnabled) {
        logger.log(`CORS enabled with origin(s): ${config.corsAllowed.join(', ')}`)
        app.use(
            cors({
                credentials: true,
                origin: config.corsAllowed,
                allowedHeaders: ["Content-Type"],
            })
        )
    }

    new Routes()
    app.use("/", new General().router)
    app.use("/pastes", new Pastes().router)
    app.use("/metrics", new Metrics().router)
    app.use("/users", new Users().router)

    app.use(
        "/docs",
        swaggerUi.serve,
        swaggerUi.setup(swaggerDocument, {
            explorer: true,
            customCss: ".swagger-ui .topbar { display: none }",
        })
    )

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
        display: function () {
            return `${this.protocol}://${this.hostname}:${this.port}`
        },
    }

    if (serverListenerProperties.protocol.includes("https")) {
        sessionEnvironment.cookie.secure = true
        logger.log("Using secure cookies")
    }

    try {
        await connect(config.mongo_uri)
        logger.log(`Database connected (mongodb)`)
    } catch (err) {
        logger.error(err)
    }

    const router = await initExpressRouter()
    router.listen(serverListenerProperties.port, async () =>
        logger.log(`Server listening at ${serverListenerProperties.display()}`)
    )
}

;(async () => await setupServer())()
