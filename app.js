require('dotenv').config();
const express = require('express');
const session = require('express-session');

const paste = require('./routes/paste');
const sitemap = require('./routes/sitemap');
const metrics = require('./routes/metrics');

const app = express();

const urlRegex = new RegExp("(?<protocol>https?):\/\/(?<hostname>[A-Za-z.0-9]*)\/?:?(?<port>\d*)", "g");

const urlMatch = urlRegex.exec(process.env.SITE_URL);

const protocol = urlMatch.groups.protocol ? urlMatch.groups.protocol : "http";
const hostname = urlMatch.groups.hostname ? urlMatch.groups.hostname : "localhost";
const port = urlMatch.groups.port ? urlMatch.groups.port : 3000;

let sess = {
    secret: process.env.SECRET,
    cookie: {},
    resave: true,
    saveUninitialized: true
};

if (process.env.TRUST_PROXY > 0) {
    app.set('trust proxy', process.env.TRUST_PROXY);
}

if (protocol.includes("https")) {
    sess.cookie.secure = true;
    console.log("Using secure cookies...");
}

app.use(session(sess));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

app.locals = {
    site: {
        title: process.env.TITLE,
        description: process.env.DESCRIPTION,
        protocol,
        hostname,
        port,
    },
    defaultPaste: {
        content: `Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dicta tempore ad amet accusamus mollitia quis culpa provident odio facere, dolor quibusdam deleniti fuga minus vero molestias asperiores sequi! Officia atque, hic aspernatur culpa necessitatibus cumque doloremque rem. Fugiat vitae consectetur dolore eos voluptatibus vel, laborum saepe repellendus, dignissimos quaerat aut minus suscipit omnis possimus ipsam cumque sint repellat doloribus quasi neque quos laboriosam temporibus ullam? Ipsa maiores sequi quod perspiciatis vero cumque voluptatum quibusdam, ex impedit necessitatibus! Aliquid nulla ipsam, cupiditate aspernatur id eius fugit quasi maxime esse nam cum. Sunt tempore exercitationem praesentium, recusandae omnis asperiores sequi mollitia amet!

Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dicta tempore ad amet accusamus mollitia quis culpa provident odio facere, dolor quibusdam deleniti fuga minus vero molestias asperiores sequi! Officia atque, hic aspernatur culpa necessitatibus cumque doloremque rem. Fugiat vitae consectetur dolore eos voluptatibus vel, laborum saepe repellendus, dignissimos quaerat aut minus suscipit omnis possimus ipsam cumque sint repellat doloribus quasi neque quos laboriosam temporibus ullam? Ipsa maiores sequi quod perspiciatis vero cumque voluptatum quibusdam, ex impedit necessitatibus! Aliquid nulla ipsam, cupiditate aspernatur id eius fugit quasi maxime esse nam cum. Sunt tempore exercitationem praesentium, recusandae omnis asperiores sequi mollitia amet!`
    }
};

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('pages/index');
});

// Implement also user metrics
app.get('/metrics', metrics.get);

app.get('/sitemap.xml', sitemap.get);

// PASTES
app.post('/pastes', paste.new);

app.get('/pastes/:id', paste.get); // Might be wise to move into /pastes?id=xyz

// app.delete('/pastes', paste.delete);

// Contains different filterings: latest, greatest, search text in title
// app.get('/pastes', paste.filter);

// USERS
// Not yet implemented
// app.post('/auth', user.auth)

// app.post('/users', user.new)

// app.get('/users/:id', user.get);

// app.get('/users', users.filter);


app.listen(port, () => {
    console.log(`pastebin.fi API listening at ${protocol}://${hostname}:${port}`);
});