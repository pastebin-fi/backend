const mongoose = require('mongoose');

const { makeid } = require('../helpers');
const schemas = require('../schemas');

mongoose.connect(process.env.MONGO_URI);

const Paste = mongoose.model('Paste', schemas.PasteSchema);
exports.Paste = Paste;

exports.new = (req, res) => {
    if (req.body.paste === "") {
        res.redirect('/');
        return;
    }
    const paste = {
        title: req.body.title,
        author: null,
        id: makeid(12),
        ip: process.env.TRUST_PROXY > 0 ? req.headers['x-forwarded-for'] : req.socket.remoteAddress.replace(/^.*:/, ''),
        content: req.body.paste,
        hidden: req.body.hidden === "on" ? true : false,
        meta: {
            votes: null,
            favs: null,
            views: 0,
            size: Buffer.byteLength(req.body.paste, 'utf8'),
        },
    };

    Paste.create(paste, (err, paste) => {
        if (err) throw err;
        res.redirect('/p/' + paste.id);
    });
};

exports.get = (req, res) => {
    // Show other similar pastes under the paste

    Paste.findOne({ id: req.params.id }).exec(async(err, paste) => {
        if (err) throw err
        await Paste.findOneAndUpdate({ id: req.params.id }, { $inc: { 'meta.views': 1 } });
        if (!paste.meta.size) {
            paste.meta.size = Buffer.byteLength(paste.content, 'utf8');
            await Paste.findOneAndUpdate({ id: req.params.id }, { $inc: { 'meta.size': paste.meta.size } });
        }

        res.render('pages/paste', {
            paste
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