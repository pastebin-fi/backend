const mongoose = require('mongoose');
const sha256 = require('js-sha256').sha256;
const findInFiles = require('find-in-files');
const fs = require('fs/promises');

const { makeid, checkReputation } = require('../helpers');
const schemas = require('../schemas');

mongoose.connect(process.env.MONGO_URI);

const Paste = mongoose.model('Paste', schemas.PasteSchema);
exports.Paste = Paste;

const abuseipdbKey = process.env.ABUSEIPDB_KEY
const dataDir = process.env.DATA_DIR

exports.new = async (req, res) => {
    if (req.body.username === "") {
        return res.status(413).send({
            "error": "Käyttäjänimi tulee mainita."
        })
    } else if (req.body.email === "") {
        return res.status(413).send({
            "error": "Sähköposti tulee mainita"
        })
    } else if (req.body.password === "") {
        return res.status(413).send({
            "error": "Salasana tulee mainita"
        })
    }

    const ip = process.env.TRUST_PROXY > 0 ? req.headers['x-forwarded-for'] : req.socket.remoteAddress.replace(/^.*:/, '');
    const reputation = JSON.parse(await checkReputation(ip, abuseipdbKey))

    if ("errors" in reputation) {
        reputation.errors.forEach(error => {
            console.log('AbuseIPDB', error)
        });
    } else {
        if (reputation.data.abuseConfidenceScore > 60) {
            res.status(403).send({
                "error": "IP-osoitteesi on mustalla listalla emmekä hyväksy uusia käyttäjiä sieltä."
            });
            return;
        }
    }

    const username = req.body.paste
    const email = req.body.email
    const password = req.body.password

    if (username.length < 3 || username.length > 20) {
        res.status(413).send({
            "error": "Käyttäjänimen tulee olla 3-20 merkkiä pitkä."
        });
        return;
    }

    if (email.length < 3 || email.length > 320) {
        res.status(413).send({
            "error": "Sähköpostin tulee olla 3-320 merkkiä pitkä."
        });
        return;
    }

    // Salasanan pituus on varmistettu oletuksena bcrypt-kirjastossa

    const hash = sha256(content)
    if (await Paste.exists({ sha256: hash })) {
        console.log("Liite samalla sisällöllä on jo olemassa")
        const id = (await Paste.findOne({ sha256: hash }).select('id -_id')).id
        res.send({
            "id": id
        });
        return;
    }

    const paste = {
        title: title,
        author: null,
        id: makeid(7),
        ip: ip,
        hidden: req.body.hidden == "true" ? true : false,
        sha256: hash,
        deletekey: makeid(64),
        meta: {
            votes: null,
            favs: null,
            views: 0,
            size: size,
        },
    };

    await fs.writeFile(`${dataDir}/${hash}`, content);

    Paste.create(paste, (err, paste) => {
        if (err) throw err;
        console.log(`${Date.now().toString()} - New paste created with id ${paste.id}`);
        res.send({
            "id": paste.id
        });
    });
};