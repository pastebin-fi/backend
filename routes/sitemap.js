exports.get = (req, res) => {
    Paste.find().exec((err, pastes) => {
        if (err) throw err
        res.set('Content-Type', 'text/xml');
        res.render('sitemap', {
            pastes
        });
    });
};