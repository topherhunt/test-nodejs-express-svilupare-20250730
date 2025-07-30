// File: app.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const db = require('./db');

const app = express();

// Configuro EJS e i layout
app.set('view engine', 'ejs');
app.use(expressLayouts);

// Cartella per file statici (CSS, immagini)
app.use(express.static('public'));

// Body parser per form
app.use(bodyParser.urlencoded({ extended: false }));

// Sessioni in memoria (per sviluppo)
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false
}));

// Rendere l'utente disponibile in tutte le view
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;
  next();
});

// Importo e registro le route (creeremo questi file dopo)
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/posts', require('./routes/posts'));

// Home page
app.get('/', (req, res) => {
  res.render('index');
});

// Avvio server
app.listen(3000, () => {
  console.log('Server avviato su http://localhost:3000');
});