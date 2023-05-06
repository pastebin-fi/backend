import { sha256 } from "js-sha256"
import { readFile } from "fs/promises"
import { RequestHandler, Router } from "express"

import config from "../config"
import { newPasteRateLimiter } from "../ratelimiters/pastes"
import { makeid } from "../helpers"
import { Routes } from "./router"

type RequestParams = Parameters<RequestHandler>

class Pastes extends Routes {
    router: Router

    constructor() {
        super()

        this.router = Router()
        this.router.post(
            "/",
            newPasteRateLimiter,
            this.checkClientReputation.bind(this),
            this.newPaste.bind(this)
        ) // Create a new paste
        this.router.get("/:id", this.getPaste.bind(this)) // Get a specific paste
        this.router.get("/", this.filterPastes.bind(this)) // Search pastes
    }

    sendPasteNotFoundResponse(res: RequestParams[1]) {
        return this.sendErrorResponse(
            res,
            404,
            "Liitettä ei löytynyt",
            "Olemme pahoillamme, mutta hakemaasi liitettä ei löytynyt."
        )
    }

    async newPaste(req: RequestParams[0], res: RequestParams[1]) {
        const body = await req.body
        if (!body || !body.paste)
            return this.sendErrorResponse(
                res,
                400,
                "Pyynnön vartalo on pakollinen",
                "Et voi luoda tyhjää pyyntöä."
            )

        const content = body.paste
        const title = body.title
        const size = Buffer.byteLength(content, "utf8")
        const language = body.language ?? "text"

        // Run checks
        if (!content) {
            return this.sendErrorResponse(res, 400, "Sisältö on pakollinen", "Et voi luoda tyhjää liitettä.")
        }

        if (size > 10000000)
            return this.sendErrorResponse(
                res,
                413,
                "Liite on liian iso",
                "Palveluun ei voi luoda yli kymmenen (10) MB liitteitä."
            )

        if (title.length > 300)
            return this.sendErrorResponse(
                res,
                413,
                "Virheellinen nimi",
                "Palveluun ei voi luoda liitettä yli 300 merkin otsikolla."
            )

        if (language.length > 30)
            return this.sendErrorResponse(
                res,
                413,
                "Virheellinen ohjelmointikieli",
                "Ohjelmointikielen nimi ei voi olla yli kolmeakymmentä (30) merkkiä."
            )

        const hash = sha256(content)
        if (await this.PasteModel.exists({ sha256: hash })) {
            const existingPasteID = (await this.PasteModel.findOne({ sha256: hash }).select("id -_id"))?.id
            return this.sendErrorResponse(
                res,
                409,
                "Liite on jo olemassa",
                "Luotu liite on jo olemassa, joten sitä ei luotu.",
                { pasteIdentifier: existingPasteID }
            )
        }

        const deletekey = makeid(64)
        const paste = {
            ip: req.ip,
            content,
            deletekey,
            title: title,
            id: makeid(7),
            hidden: req.body.private == true ? true : false,
            programmingLanguage: language,
            sha256: hash,
            meta: {
                votes: null,
                favs: null,
                views: 0,
                size: size,
            },
        }

        // await fs.writeFile(`${dataDir}/${hash}`, content);
        this.PasteModel.create(paste, (err, paste) => {
            if (err) {
                this.logger.log(err)
                this.sendErrorResponse(
                    res,
                    500,
                    "Liitettä ei voitu luoda",
                    "Jotain meni vikaan, eikä liitettä luotu."
                )
            }
            this.logger.log(`${req.ip} - ${Date.now().toString()} - New paste created with id ${paste.id}`)
        })

        res.send({
            id: paste.id,
            delete: deletekey,
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
            await this.PasteModel.findOneAndUpdate({ id: requestedId }, { $inc: { "meta.views": 1 } })
        } catch (err) {
            return this.sendPasteNotFoundResponse(res)
        }

        if (paste.meta && !paste.meta.size) {
            paste.meta.size = Buffer.byteLength(paste.content || "", "utf8")
            await this.PasteModel.findOneAndUpdate(
                { id: requestedId },
                { $inc: { "meta.size": paste.meta.size } }
            )
        }

        if (paste.removed?.isRemoved) {
            res.send(paste.removed)
        }

        // Filter out unwanted data (ip address, removal and so on...)
        const allowedKeys = [
            "programmingLanguage",
            "hidden",
            "id",
            "content",
            "meta",
            "allowedreads",
            "date",
            "author",
            "title",
        ]

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
            if (typeof var1 !== typeof var2) return var2
            else return var1
        }

        // TODO: Highlight the search result for client. || can be done on the client side
        let query = varOrDefault(req.query.q, "")
        let offset = varOrDefault(req.query.offset, 0)
        let limit = varOrDefault(req.query.limit, 10)
        let sorting = varOrDefault(req.query.sorting, "-date")

        // Do not allow too many pastes
        limit = limit > 30 ? 30 : limit

        const allowedSortings = [
            "-date",
            "date",
            "-meta.views",
            "meta.views",
            "-meta.size",
            "meta.size",
        ]
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
