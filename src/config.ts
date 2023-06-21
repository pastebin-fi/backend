export default {
    mongo_uri: process.env.MONGO_URI || "mongodb://<username>:<password>@<host>/<...>",
    site_url: process.env.SITE_URL || "http://127.0.0.1",
    trust_proxy: process.env.TRUST_PROXY || 0,
    secret: process.env.SECRET || "keyboard cat",
    abuseipdb_key: process.env.ABUSEIPDB_KEY || "",
    data_dir: process.env.DATA_DIR || "./data",

    allow_registrations: process.env.ALLOW_REGISTER != "false",
    unknown_author: {
        name: "Tuntematon",
        avatar: "https://images.unsplash.com/photo-1534294668821-28a3054f4256?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
    },
}
