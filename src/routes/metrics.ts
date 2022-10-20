import { Router } from "express";
import { Routes } from "./router";

class Metrics extends Routes {
    router: Router

    constructor() {
        super()

        this.router = Router()
        this.router.get("/", this.getMetrics)
    }

    async getMetrics(req, res) {
        const nopastes = () => this.sendErrorResponse(res, 404, "Liitteitä ei löytynyt", 
                "Emme ole vastaanottaneet vielä yhtäkään liitettä. Ole ensimmäinen!"
            )

        let pastes = undefined
        try {
            pastes = await this.PasteModel.find().select('meta.views hidden -_id')
            if (!pastes) return nopastes()
        } catch (err) {
            return nopastes()
        }

        let pasteCount = {
            total: 0,
            public: 0,
            private: 0,
        }

        const totalViews = pastes
            .map(paste => {
                pasteCount.total += 1
                if (paste.hidden) pasteCount.private += 1
                else pasteCount.public += 1

                return paste.meta?.views
            })
            .filter(views => views != null)
            .reduce((a, b) => a && b ? a + b : a, 0)
        
            
        res.send({
            "totalViews": totalViews,
            "pasteCount": pasteCount,
        });
    };
}


export { Metrics }