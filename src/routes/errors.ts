interface CustomError {
    error: string
    message: string
}

const userErrors = {
    userNotFound: {
        error: "Käyttäjää ei löytynyt",
        message: "Olemme pahoillamme, mutta hakemaasi käyttäjää ei löytynyt.",
    },
    sessionNotFound: {
        error: "Istuntoa ei löytynyt",
        message: "Poistettavaa istuntoa ei löytynyt.",
    },
    invalidPicUrl: {
        error: "Virheellinen osoite",
        message: "Tätä osoitetta ei voida käyttää kuvien hakemiseen.",
    },
    registrationFailed: {
        error: "Rekisteröinti epäonnistui",
        message: "Rekisteröintejä ei oteta tällä hetkellä vastaan.",
    },
    registrationFailedRatelimit: {
        error: "Rekisteröinti epäonnistui",
        message: "Olet tehnyt käyttäjän viimeisen vuorokauden sisään.",
    },
    invalidBody: {
        error: "Pyynnön vartalo ei vastaa odotuksia",
        message: "Pyynnön vartalo on puutteellinen, ja siitä ei löydy kaikkea tarvittavaa.",
    },
    invalidUsername: {
        error: "Virheellinen käyttäjänimi",
        message:
            "Käyttäjänimen tulee koostua 3-20 merkistä ja kirjaimista a-z, numeroista 0-9, erikoismerkeistä '_, -' ja alkaa kirjaimella a-z.",
    },
    invalidPassword: {
        error: "Virheellinen salasana",
        message: "Salasanan tulee olla vähintään 8 merkkiä pitkä.",
    },
    invalidEmail: {
        error: "Virheellinen sähköpostiosoite",
        message: "Sähköpostiosoite on virheellinen, joten käyttäjää ei luotu.",
    },
    userAlreadyExists: {
        error: "Käyttäjä on jo olemassa",
        message: "Luotu käyttäjä on jo olemassa, joten sitä ei luotu.",
    },
    userCreationInternal: {
        error: "Käyttäjää ei voitu luoda",
        message: "Jotain meni vikaan, eikä käyttäjää luotu.",
    },
    userAlreadyLoggedIn: {
        error: "Kirjautuminen epäonnistui",
        message: "Olet jo kirjautunut sisään",
    },
    loginFailed: {
        error: "Kirjautuminen epäonnistui",
        message: "Salasana on virheellinen",
    },
    badIP: {
        error: "Pääsy evätty",
        message: "IP-osoitteesi maine on huono, joten hylkäsimme pyyntösi uuden liitteen luomiseksi.",
    },
}

const pasteErrors = {
    notFound: {
        error: "Liitettä ei löytynyt",
        message: "Hakemaasi liitettä ei löytynyt.",
    },
    invalidBody: {
        error: "Pyynnön vartalo ei vastaa odotuksia",
        message: "Pyynnön vartalo on puutteellinen, ja siitä ei löydy kaikkea tarvittavaa.",
    },
    tooBig: {
        error: "Liite on liian iso",
        message: "Palveluun ei voi luoda yli kymmenen (10) MB liitteitä.",
    },
    invalidName: {
        error: "Virheellinen nimi",
        message: "Palveluun ei voi luoda liitettä yli 300 merkin otsikolla.",
    },
    pasteAlreadyExists: {
        error: "Liite on jo olemassa",
        message: "Luotu liite on jo olemassa, joten sitä ei luotu.",
    },
    pasteNotCreated: {
        error: "Liitettä ei luotu",
        message: "Jotain meni vikaan, eikä liitettä luotu.",
    },
}

const errors = {
    internal: {
        error: "Järjestelmävirhe",
        message: "Jotain meni vikaan, eikä pyyntöä suoritettu loppuun.",
    },
}

export { CustomError, userErrors, pasteErrors, errors }
