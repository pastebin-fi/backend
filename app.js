require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')

const { Schema } = mongoose;
const app = express()
const port = 3000

app.use(express.urlencoded());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

const makeid = (length) => {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

const PasteSchema = new Schema({
  title: String,
  id: { type: String, default: makeid(12) },
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

PasteSchema.index({
  title: 'text',
  content: 'text', 
  id: 'text'
});

const Paste = mongoose.model('Paste', PasteSchema);

app.locals = {
  site: {
      title: process.env.TITLE,
      description: process.env.DESCRIPTION,
      hostname: process.env.HOSTNAME
  },
  defaultPaste: {
    content: `Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dicta tempore ad amet accusamus mollitia quis culpa provident odio facere, dolor quibusdam deleniti fuga minus vero molestias asperiores sequi! Officia atque, hic aspernatur culpa necessitatibus cumque doloremque rem. Fugiat vitae consectetur dolore eos voluptatibus vel, laborum saepe repellendus, dignissimos quaerat aut minus suscipit omnis possimus ipsam cumque sint repellat doloribus quasi neque quos laboriosam temporibus ullam? Ipsa maiores sequi quod perspiciatis vero cumque voluptatum quibusdam, ex impedit necessitatibus! Aliquid nulla ipsam, cupiditate aspernatur id eius fugit quasi maxime esse nam cum. Sunt tempore exercitationem praesentium, recusandae omnis asperiores sequi mollitia amet!

Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dicta tempore ad amet accusamus mollitia quis culpa provident odio facere, dolor quibusdam deleniti fuga minus vero molestias asperiores sequi! Officia atque, hic aspernatur culpa necessitatibus cumque doloremque rem. Fugiat vitae consectetur dolore eos voluptatibus vel, laborum saepe repellendus, dignissimos quaerat aut minus suscipit omnis possimus ipsam cumque sint repellat doloribus quasi neque quos laboriosam temporibus ullam? Ipsa maiores sequi quod perspiciatis vero cumque voluptatum quibusdam, ex impedit necessitatibus! Aliquid nulla ipsam, cupiditate aspernatur id eius fugit quasi maxime esse nam cum. Sunt tempore exercitationem praesentium, recusandae omnis asperiores sequi mollitia amet!`
  }
}

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
    res.render('pages/index')
})

app.get('/new', (req, res) => {
  res.render('pages/index')
})

app.post('/new', (req, res) => {
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
    res.redirect('/p/' + paste.id)
  })
})


app.get('/latest', (req, res) => {
  Paste.find({ hidden: false }).sort({date:-1}).limit(20).exec((err, pastes) => {
    if (err) throw err
    res.render('pages/latest', {
      pastes
    })
  })
})

app.get('/search', (req, res) => {
  // Use later full text indexes...s

  let query = req.query.q
  let page = req.query.page
  let skip = page ? page : 0 * 10
  let limit = skip + 10
  Paste.find({ title: { "$regex": query, "$options": "i" }, hidden: false })
    .sort('date')
    .skip(skip)
    .limit(limit)
    .exec((err, pastes) => {
      if (err) throw err
      res.render('pages/latest', {
        pastes
      })
  })
})

app.get('/p/:id', (req, res) => {
  Paste.findOne({ id: req.params.id }).exec((err, paste) => {
    if (err) throw err
    res.render('pages/paste', {
      paste
    })
  })
})

// Sitemap and other
app.get('/sitemap.xml', (req, res) => {
  Paste.find().exec((err, pastes) => {
    if (err) throw err
    res.set('Content-Type', 'text/xml');
    res.render('sitemap', {
      pastes
    })
  })
})

app.listen(port, () => {
  console.log(`PowerPaste app listening at http://localhost:${port}`)
})