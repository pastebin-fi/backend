import rateLimit from "express-rate-limit"

// Limit each IP to 5 create account requests per `window` (here, per day)
// -> keep in mind that account creations can be unsuccesful but they should
//    not because frontend tells if cannot be created
export const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000 * 24, // 1 day
    max: 5,
    message:
        "Liian monta käyttäjää on luotu tästä IP-osoitteesta tietyn aikavälin sisään. Yritäthän myöhemmin uudelleen.",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Limit each IP to 20 login requests per 30 mins
export const loginAccountLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 20,
    message:
        "Liian monta kirjautumisyritystä aikarajan sisään tehtiin tästä IP-osoitteesta. Yritäthän myöhemmin uudelleen.",
    standardHeaders: true,
    legacyHeaders: false,
})
