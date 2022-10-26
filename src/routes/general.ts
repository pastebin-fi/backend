import { Router } from "express"
import { Routes } from "./router"

class General extends Routes {
    router: Router

    constructor() {
        super()

        // General routes
        this.router = Router()
        this.router.get("/ip", (req, res) => res.send({ ip: req.ip }))
        this.router.get("/", (_, res) => res.send({ status: "up" }))
    }
}

export { General }
