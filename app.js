require('dotenv').config();
const express = require('express');
const session = require('express-session');

const sitemap = require('./routes/sitemap');

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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('pages/index');
});

app.get('/new', (req, res) => {
    res.render('pages/index');
});

app.post('/new', paste.new)

app.get('/search', paste.search);

app.get('/p/:id', paste.get);

app.get('/r/:id', paste.raw);

app.get('/dl/:id', paste.download);

app.get('/sitemap.xml', sitemap.get);

app.listen(port, () => {
    console.log(`PowerPaste app listening at ${protocol}://${hostname}:${port}`);
});