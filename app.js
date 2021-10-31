const express = require('express')
const app = express()
const port = 3000

app.locals = {
  site: {
      title: 'PowerPaste',
      description: 'The best pastebin service ever'
  }
}

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
    res.render('pages/index')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})