const Paste = require('./paste').Paste;

exports.get = (req, res) => {
    Paste.find({ hidden: false }).exec((err, pastes) => {
        if (err) throw err
        res.set('Content-Type', 'text/xml');
        res.render('sitemap', {
            pastes
        });
    });
};