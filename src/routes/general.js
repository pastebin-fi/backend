import { Router } from "express"
import { Routes } from "./router.js"

class General extends Routes {
    constructor() {
        super()
        // General routes
        this.router = Router()
        this.router.get("/ip", (req, res) => res.send({ ip: req.ip }))
        this.router.get("/", (_, res) => res.send({ status: "up" }))
    }
}

export { General }
