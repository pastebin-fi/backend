import config from "../config"
import rateLimit from "express-rate-limit"

// Limit each IP to 20 new paste requests per `window` (here, 30 mins)
export const newPasteRateLimiter = rateLimit({
    skip: () => config.skipRatelimiters,
    windowMs: 30 * 60 * 1000,
    max: 20,
    message: {
        title: "IP-osoitetta on rajoitettu",
        message: "Liian monta liitettä on luotu IP-osoitteestasi. Kokeile myöhemmin uudelleen.",
    },
    standardHeaders: true,
    legacyHeaders: false,
})
