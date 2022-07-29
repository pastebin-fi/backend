const mongoose = require('mongoose');
const sha256 = require('js-sha256').sha256;
const S3 = require('aws-sdk/clients/s3');
const AWS = require('aws-sdk');

const { makeid, checkReputation } = require('../helpers');
const schemas = require('../schemas');

mongoose.connect(process.env.MONGO_URI);

const Paste = mongoose.model('Paste', schemas.PasteSchema);
exports.Paste = Paste;

const abuseipdbKey = process.env.ABUSEIPDB_KEY

const accessKeyId = process.env.S3_ACCESS_KEY
const secretAccessKey = process.env.S3_SECRET_KEY
const region = process.env.S3_REGION
const serviceUrl = process.env.S3_SERVICE_URL
const bucket = process.env.S3_BUCKET

const wasabiEndpoint = new AWS.Endpoint(serviceUrl);

const s3 = new S3({
  endpoint: wasabiEndpoint,
  region: region,
  accessKeyId,
  secretAccessKey
});

exports.new = async (req, res) => {
    if (req.body.paste === "") {
        res.redirect('/');
        return;
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
                "error": "IP-osoitteesi on mustalla listalla emmekä hyväksy uusia liitteitä sieltä."
            });
            return;
        }
    }

    const content = req.body.paste
    const title = req.body.title
    const size = Buffer.byteLength(content, 'utf8')

    if (size > 10_000_000) {
        res.status(413).send({
            "error": "Palveluun ei voi luoda ilman tiliä yli 10 MB liitteitä. Luo tili nostaaksesi raja 20 MB."
        });
        return;
    }

    if (title.length > 300) {
        res.status(413).send({
            "error": "Palveluun ei voi luoda liitettä yli 300 merkin otsikolla."
        });
        return;
    }

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
        hidden: req.body.hidden === "on" ? true : false,
        sha256: hash,
        deletekey: makeid(64),
        meta: {
            votes: null,
            favs: null,
            views: 0,
            size: size,
        },
    };

    s3.putObject({
        Body: content,
        Bucket: bucket,
        Key: hash
    }, (err, data) => {
        if (err) console.log(err)
    });

    Paste.create(paste, (err, paste) => {
        if (err) throw err;
        console.log(`${Date.now().toString()} - New paste created with id ${paste.id}`);
        res.send({
            "id": paste.id
        });
    });
};

// Rajoita näkyviin vain tietyt valitut tiedot
exports.get = (req, res) => {
    // Show other similar pastes under the paste

    Paste.findOne({ id: req.params.id }).exec(async(err, paste) => {
        if (err) throw err
        await Paste.findOneAndUpdate({ id: req.params.id }, { $inc: { 'meta.views': 1 } });
        if (!paste.meta.size) {
            paste.meta.size = Buffer.byteLength(paste.content, 'utf8');
            await Paste.findOneAndUpdate({ id: req.params.id }, { $inc: { 'meta.size': paste.meta.size } });
        }

        console.log(`${Date.now().toString()} - Paste requested with id ${paste.id}`);

        res.send({
            "paste": paste
        });
    });
};

exports.raw = (req, res) => {
    Paste.findOne({ id: req.params.id }).exec(async(err, paste) => {
        if (err) throw err
        await Paste.findOneAndUpdate({ id: req.params.id }, { $inc: { 'meta.views': 1 } });
        res.set('Content-Type', 'text/plain');
        res.send(paste.content);
    });
};

exports.download = (req, res) => {
    Paste.findOne({ id: req.params.id }).exec(async(err, paste) => {
        if (err) throw err
        await Paste.findOneAndUpdate({ id: req.params.id }, { $inc: { 'meta.views': 1 } });
        res.status(200)
            .attachment(`${paste.title}.txt`)
            .send(paste.content);
    });
};

exports.search = async(req, res) => {
    // Highlight the search result for client.

    let query = req.query.q || "";
    let page = !(+req.query.page > 0) ? 1 : +req.query.page || 1;
    let skip = (page - 1) * 10;
    let limit = skip + 10;
    let sorting = (req.query.sorting && ["viimeisin", "vanhin", "suurin", "suosituin"].includes(req.query.sorting)) ? req.query.sorting : "olennaisin";
    let search = { hidden: false, $text: { $search: query } };

    let foundCount = await Paste.countDocuments(search).exec();

    let pagination = {};

    let currentPage = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    currentPage.searchParams.set('page', page - 1);
    pagination.lastPage = currentPage.pathname + currentPage.search;
    currentPage.searchParams.set('page', page + 1);
    pagination.nextPage = currentPage.pathname + currentPage.search;

    pagination.links = [];

    for (let index = page - 3; index < page + 4; index++) {
        if (index > 0) {
            let linkPage = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
            linkPage.searchParams.set('page', index);
            pagination.links.push({
                page: index,
                link: linkPage.pathname + linkPage.search
            });
        }
    }

    switch (sorting) {
        case "viimeisin":
            sortingMongo = '-date'
            break;
        case "vanhin":
            sortingMongo = 'date'
            break;
        case "suosituin":
            sortingMongo = '-meta.views'
            break;
        case "suurin":
            sortingMongo = '-meta.size'
            break;

        default:
            sortingMongo = { score: { $meta: 'textScore' } }
            break;
    }

    Paste.find(search, { score: { $meta: "textScore" } })
        .sort(sortingMongo)
        .skip(skip)
        .limit(limit)
        .exec((err, pastes) => {
            if (err) throw err
            res.render('pages/search', {
                pastes,
                title: `Hakutulokset haulle: ${query}`,
                foundCount,
                page,
                pagination,
                sorting
            });
        });
};

exports.popular = (req, res) => {
    Paste.find({ hidden: false })
        .sort('-meta.views')
        .limit(200)
        .exec((err, pastes) => {
            if (err) throw err
            res.render('pages/popular', {
                pastes
            });
        });
};

exports.archive = (req, res) => {
    Paste.find({ hidden: false })
        .sort('-date')
        .exec((err, pastes) => {
            if (err) throw err
            res.render('pages/archive', {
                pastes
            });
        });
}