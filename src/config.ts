import nodemailer from "nodemailer"
const fs = require("fs").promises
import config from "dotenv"
config.config()

// https://www.digitalocean.com/community/tutorials/how-to-work-with-files-using-the-fs-module-in-node-js
async function readFile(filePath: string) {
    try {
        const data = await fs.readFile(filePath)
        return data.toString()
    } catch (error) {
        console.error(`Got an error trying to read the file: ${error.message}`)
        return undefined
    }
}

async function getMailer() {
    const dkim =
        process.env.DKIM_ENABLED === "true"
            ? {
                  domainName: process.env.DKIM_HOST,
                  keySelector: process.env.DKIM_KEYSELECTOR,
                  privateKey: await readFile(process.env.DKIM_PRIVATEKEY_FILE),
              }
            : undefined
    return nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT),
        secure: process.env.MAIL_SECURE === "true",
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD,
        },
        dkim,
    })
}

export default {
    mongo_uri: process.env.MONGO_URI || "mongodb://<username>:<password>@<host>/<...>",
    site_url: process.env.SITE_URL || "http://127.0.0.1",
    trust_proxy: process.env.TRUST_PROXY || 0,
    secret: process.env.SECRET || "keyboard cat",
    abuseipdb_key: process.env.ABUSEIPDB_KEY || "",
    data_dir: process.env.DATA_DIR || "./data",
    skipRatelimiters: process.env.SKIPRATELIMITERS == "true",
    corsEnabled: process.env.ENABLE_CORS == "true",
    corsAllowed: (process.env.ALLOWED_CORS_ORIGINS || "").split(","),
    openapiFile: process.env.PASTEBIN_OPENAPI_SPEC_FILE || "openapi.json",

    mailerEnabled: process.env.MAIL_ENABLED === "true",
    getMailer: getMailer,

    allow_registrations: process.env.ALLOW_REGISTER != "false",
    unknown_author: {
        name: "Tuntematon",
        avatar: "https://images.unsplash.com/photo-1534294668821-28a3054f4256?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
    },
}
