import { sha256 } from "js-sha256"
import { readFile } from "fs/promises"
import { RequestHandler, Router } from "express"
import { ModelOperations } from "@vscode/vscode-languagedetection"

import config from "../config"
import { newPasteRateLimiter } from "../ratelimiters/pastes"
import { makeid } from "../helpers"
import { Routes } from "./router"
import { pasteErrors } from "./errors"

const modulOperations = new ModelOperations()

type RequestParams = Parameters<RequestHandler>

class Pastes extends Routes {
    router: Router

    constructor() {
        super()

        this.router = Router()
        this.router.post("/", newPasteRateLimiter, this.checkClientReputation.bind(this), this.newPaste.bind(this)) // Create a new paste
        this.router.get("/:id", this.getPaste.bind(this)) // Get a specific paste
        this.router.get("/", this.filterPastes.bind(this)) // Search pastes
    }

    sendPasteNotFoundResponse(res: RequestParams[1]) {
        return this.sendErrorResponse(res, 404, pasteErrors.notFound)
    }

    async newPaste(req: RequestParams[0], res: RequestParams[1]) {
        const body = await req.body
        const content = body.paste
        const title = body.title
        if (!body || !content || !title) return this.sendErrorResponse(res, 400, pasteErrors.invalidBody)

        const size = Buffer.byteLength(content, "utf8")
        if (size > 10000000) return this.sendErrorResponse(res, 413, pasteErrors.tooBig)

        if (title.length > 300) return this.sendErrorResponse(res, 413, pasteErrors.invalidName)

        const hash = sha256(content)
        const language_guesses = await modulOperations.runModel(content)

        // most likely returned when paste is under 20 chars
        // or no programming language
        let language = "plaintext"

        if (language_guesses.length > 0 && language_guesses[0].confidence > 0.1) {
            language = language_guesses[0].languageId
        }

        if (await this.PasteModel.exists({ sha256: hash })) {
            const existingPasteID = (await this.PasteModel.findOne({ sha256: hash }).select("id -_id"))?.id
            return this.sendErrorResponse(res, 409, pasteErrors.pasteAlreadyExists, {
                pasteIdentifier: existingPasteID,
            })
        }

        const authorIdentity = await this.requireAuthentication(req)

        const deletekey = makeid(64)
        const paste = {
            ip: req.ip,
            content,
            author: authorIdentity?.user.name || undefined,
            deletekey,
            title: title,
            id: makeid(7),
            hidden: req.body.private == true ? true : false,
            lang: language,
            sha256: hash,
            meta: {
                votes: null,
                favs: null,
                views: 0,
                size: size,
            },
        }

        // await fs.writeFile(`${dataDir}/${hash}`, content);
        try {
            await this.PasteModel.create(paste)
            this.logger.log(`${req.ip} - ${Date.now().toString()} - New paste created with id ${paste.id}`)
        } catch (err) {
            this.logger.log(err)
            return this.sendErrorResponse(res, 500, pasteErrors.pasteNotCreated)
        }

        res.send({
            id: paste.id,
            delete: deletekey,
            language,
        })
    }

    async getPaste(req: RequestParams[0], res: RequestParams[1]) {
        // Show other similar pastes under the paste
        const requestedId = req.params.id
        let paste = undefined

        try {
            paste = await this.PasteModel.findOne({ id: requestedId })
            if (!paste) return this.sendPasteNotFoundResponse(res)
        } catch (e) {
            return this.sendPasteNotFoundResponse(res)
        }

        try {
            if (!("scrape" in req.query)) {
                await this.PasteModel.findOneAndUpdate({ id: requestedId }, { $inc: { "meta.views": 1 } })
            }
        } catch (err) {
            return this.sendPasteNotFoundResponse(res)
        }

        if (paste.meta && !paste.meta.size) {
            paste.meta.size = Buffer.byteLength(paste.content || "", "utf8")
            await this.PasteModel.findOneAndUpdate({ id: requestedId }, { $inc: { "meta.size": paste.meta.size } })
        }

        if (!paste.lang) {
            const language_guesses = await modulOperations.runModel(paste.content)

            // most likely returned when paste is under 20 chars
            // or no programming language
            let language = "plaintext"

            if (language_guesses.length > 0 && language_guesses[0].confidence > 0.1) {
                language = language_guesses[0].languageId
            }

            await this.PasteModel.findOneAndUpdate({ id: requestedId }, { lang: language })
        }

        if (paste.removed?.isRemoved) {
            res.send(paste.removed)
        }

        // Filter out unwanted data (ip address, removal and so on...)
        const allowedKeys = ["lang", "hidden", "id", "content", "meta", "allowedreads", "date", "author", "title"]

        let visiblePaste = JSON.parse(JSON.stringify(paste)) // https://stackoverflow.com/questions/9952649/convert-mongoose-docs-to-json
        Object.keys(visiblePaste).forEach((key) => allowedKeys.includes(key) || delete visiblePaste[key])

        try {
            const content = await readFile(`${config.data_dir}/${paste.sha256}`)

            visiblePaste.content = content.toString()
            visiblePaste.author = {
                name: "tuntematon",
                avatar: "https://images.unsplash.com/photo-1534294668821-28a3054f4256?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
            }
        } catch (error) {
            visiblePaste.content = paste.content
        }

        res.send(visiblePaste)
    }

    async filterPastes(req: RequestParams[0], res: RequestParams[1]) {
        function varOrDefault(var1, var2) {
            if (!var1) return var2
            else return var1
        }

        let query = varOrDefault(req.query.q, "")
        let offset = varOrDefault(req.query.offset, 0)
        let limit = varOrDefault(req.query.limit, 10)
        let sorting = varOrDefault(req.query.sorting, "-date")

        // Do not allow too many pastes
        limit = limit > 30 ? 30 : limit

        const allowedSortings = ["-date", "date", "-meta.views", "meta.views", "-meta.size", "meta.size"]
        if (!allowedSortings.includes(sorting)) sorting = "-date"

        let score = {}
        let search: {
            hidden: boolean
            $text?: { $search: any }
        } = { hidden: false }
        if (query) {
            score = { score: { $meta: "textScore" } }
            search.$text = { $search: query }
        }

        this.PasteModel.find(search, score)
            .sort(sorting)
            .skip(offset)
            .limit(limit)
            .select("id title meta author date -_id")
            .lean()
            .exec((err, pastes) => {
                if (err) this.logger.error(err)
                if (!pastes) return res.send([])

                res.send(pastes)
            })
    }
}

export default Pastes
