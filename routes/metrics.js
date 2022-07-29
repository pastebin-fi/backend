const Paste = require('./paste').Paste;

exports.get = (req, res) => {
    Paste.find().select('meta.views hidden -_id').exec((err, pastes) => {
        if (err) throw err
        const totalViews = pastes
            .map(paste => paste.meta.views)
            .filter(view => ![null, undefined].includes(view))
            .reduce((a, b) => a + b, 0)

            
        const totalPastes = pastes.length
        const privatePastes = pastes
            .map(paste => paste.hidden)
            .filter((hidden) => { return hidden == true })
            .reduce((a, b) => a + b, 0)
        const publicPastes = totalPastes - privatePastes
        
        
        res.send({
            "totalViews": totalViews,
            "pasteCount": {
                "total": totalPastes,
                "public": publicPastes,
                "private": privatePastes
            },
        });
    });
};