require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')

const { Schema } = mongoose;
const app = express()
const port = 3000

app.use(express.urlencoded());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

const PasteSchema = new Schema({
  title: String,
  author: String,
  ip: String,
  content: String,
  date: { type: Date, default: Date.now },
  hidden: Boolean,
  meta: {
    votes: Number,
    favs:  Number,
    views: Number
  }
});

const Paste = mongoose.model('Paste', PasteSchema);

app.locals = {
  site: {
      title: 'PowerPaste',
      description: 'The best pastebin service ever'
  },
  paste: {
    content: `Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dicta tempore ad amet accusamus mollitia quis culpa provident odio facere, dolor quibusdam deleniti fuga minus vero molestias asperiores sequi! Officia atque, hic aspernatur culpa necessitatibus cumque doloremque rem. Fugiat vitae consectetur dolore eos voluptatibus vel, laborum saepe repellendus, dignissimos quaerat aut minus suscipit omnis possimus ipsam cumque sint repellat doloribus quasi neque quos laboriosam temporibus ullam? Ipsa maiores sequi quod perspiciatis vero cumque voluptatum quibusdam, ex impedit necessitatibus! Aliquid nulla ipsam, cupiditate aspernatur id eius fugit quasi maxime esse nam cum. Sunt tempore exercitationem praesentium, recusandae omnis asperiores sequi mollitia amet!

Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dicta tempore ad amet accusamus mollitia quis culpa provident odio facere, dolor quibusdam deleniti fuga minus vero molestias asperiores sequi! Officia atque, hic aspernatur culpa necessitatibus cumque doloremque rem. Fugiat vitae consectetur dolore eos voluptatibus vel, laborum saepe repellendus, dignissimos quaerat aut minus suscipit omnis possimus ipsam cumque sint repellat doloribus quasi neque quos laboriosam temporibus ullam? Ipsa maiores sequi quod perspiciatis vero cumque voluptatum quibusdam, ex impedit necessitatibus! Aliquid nulla ipsam, cupiditate aspernatur id eius fugit quasi maxime esse nam cum. Sunt tempore exercitationem praesentium, recusandae omnis asperiores sequi mollitia amet!`
  }
}

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
    res.render('pages/index')
})

app.get('/new', (req, res) => {
  res.render('pages/new')
})

app.get('/latest', (req, res) => {
  Paste.find({}).sort('date').limit(20).exec((err, pastes) => {
    if (err) throw err
    res.render('pages/latest', {
      pastes
    })
  })
})

// API
app.post('/api/paste', (req, res) => {
  const paste = {
    title: req.body.title,
    author: null,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress.replace(/^.*:/, ''),
    content: req.body.paste,
    hidden: req.body.hidden === "on" ? true : false,
    meta: {
      votes: null,
      favs:  null,
      views: 0
    }
  }
  Paste.create(paste, (err, paste) => {
    if (err) throw err;
    res.send(paste)
  })
})

app.listen(port, () => {
  console.log(`PowerPaste app listening at http://localhost:${port}`)
})