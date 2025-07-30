**Guida passo-passo: Creare un server Node.js/Express con autenticazione, utenti, post e commenti**
*Tutta la guida è in italiano e presuppone zero conoscenze pregresse di Node.js o concetti MVC.*

---

## 1) Configurazione base dell’app

**Cosa stiamo per fare e perché:**
Per prima cosa creeremo la cartella del progetto, installeremo Node.js e tutti i pacchetti fondamentali. Questo serve a dare “forma” al nostro server Express, impostare il motore di template EJS per le pagine HTML dinamiche e preparare il database SQLite.

1. **Installare Node.js**
   Vai su [https://nodejs.org](https://nodejs.org) e scarica la versione LTS per il tuo sistema operativo. Node.js include anche NPM (Node Package Manager), necessario per installare le librerie.

2. **Creare la cartella del progetto**

   ```bash
   mkdir mio-blog-express
   cd mio-blog-express
   ```

3. **Inizializzare `package.json`**
   `package.json` tiene traccia delle dipendenze e degli script di avvio.

   ```bash
   npm init -y
   ```

   Dopo questo comando, vedrai un file `package.json` in cui sono elencate informazioni base del progetto.

4. **Installare le dipendenze essenziali**

   * **express**: il framework web.
   * **ejs**: motore di template per generare HTML dinamico.
   * **express-ejs-layouts**: per usare un layout comune (header/footer) su tutte le pagine.
   * **sqlite3**: database leggero su file.
   * **body-parser**: per leggere i dati dei form.
   * **express-session**: per gestire sessioni e autenticazione.

   ```bash
   npm install express ejs express-ejs-layouts sqlite3 body-parser express-session
   ```

5. **Struttura cartelle**
   Creiamo una struttura di base:

   ```
   mio-blog-express/
   ├── app.js
   ├── package.json
   ├── db.js
   ├── views/
   │   ├── layout.ejs
   │   ├── index.ejs
   │   ├── auth/
   │   │   ├── login.ejs
   │   │   └── signup.ejs
   │   ├── users/
   │   │   ├── list.ejs
   │   │   └── detail.ejs
   │   ├── posts/
   │   │   ├── list.ejs
   │   │   ├── new.ejs
   │   │   └── show.ejs
   │   └── partials/
   │       ├── header.ejs
   │       └── footer.ejs
   └── public/
       └── css/
           └── styles.css
   ```

---

## 2) Autenticazione & pagine utenti

### 2.1) Creare `app.js`

**Cosa è `app.js` e perché serve:**
È il cuore del server: qui importiamo Express, configuriamo middlewares (lettura form, sessioni) e montiamo le route.

```js
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

// Rendere l’utente disponibile in tutte le view
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
```

### 2.2) Impostare il database: `db.js`

**Cosa è `db.js` e perché serve:**
Qui apriamo il file SQLite e creiamo tabelle se non esistono. Senza tabelle, non potremo salvare utenti, post o commenti.

```js
// File: db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// Creazione tabelle
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    body TEXT,
    inserted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    body TEXT,
    inserted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

module.exports = db;
```

### 2.3) Route & view per autenticazione

#### 2.3.1) Signup: `routes/auth.js`

**Perché “route” e file separati:**
Separiamo il codice in piccoli moduli: il router `auth.js` gestisce solo login e registrazione.

```js
// File: routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Pagina di registrazione
router.get('/signup', (req, res) => {
  res.render('auth/signup');
});

router.post('/signup', (req, res) => {
  const { username, password } = req.body;
  db.run('INSERT INTO users(username,password) VALUES(?,?)',
    [username, password],
    function(err) {
      if (err) return res.send('Errore registrazione');
      req.session.user = { id: this.lastID, username };
      res.redirect('/');
    });
});

// Pagina di login
router.get('/login', (req, res) => {
  res.render('auth/login');
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, user) => {
      if (!user) return res.send('Credenziali sbagliate');
      req.session.user = user;
      res.redirect('/');
    });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
```

#### 2.3.2) View di signup e login

**Cosa sono i template EJS:**
Sono pagine HTML con piccole istruzioni `<%= %>` per inserire variabili. Express le renderizza lato server.

```html
<!-- File: views/auth/signup.ejs -->
<%- include('../partials/header') %>
<h1>Registrati</h1>
<form action="/auth/signup" method="post">
  <label>Username:<input name="username"/></label><br/>
  <label>Password:<input type="password" name="password"/></label><br/>
  <button type="submit">Registrati</button>
</form>
<%- include('../partials/footer') %>
```

```html
<!-- File: views/auth/login.ejs -->
<%- include('../partials/header') %>
<h1>Accedi</h1>
<form action="/auth/login" method="post">
  <label>Username:<input name="username"/></label><br/>
  <label>Password:<input type="password" name="password"/></label><br/>
  <button type="submit">Accedi</button>
</form>
<%- include('../partials/footer') %>
```

---

## 3) Post & commenti

### 3.1) Route & view per utenti

#### 3.1.1) `routes/users.js`

```js
// File: routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Lista utenti
router.get('/', (req, res) => {
  db.all('SELECT id, username FROM users', [], (err, users) => {
    res.render('users/list', { users });
  });
});

// Dettaglio utente + suoi post
router.get('/:id', (req, res) => {
  const uid = req.params.id;
  db.get('SELECT id, username FROM users WHERE id = ?', [uid], (err, user) => {
    db.all('SELECT * FROM posts WHERE user_id = ?', [uid], (err, posts) => {
      res.render('users/detail', { user, posts });
    });
  });
});

module.exports = router;
```

#### 3.1.2) View utenti

```html
<!-- views/users/list.ejs -->
<%- include('../partials/header') %>
<h1>Utenti</h1>
<ul>
  <% users.forEach(u => { %>
    <li><a href="/users/<%= u.id %>"><%= u.username %></a></li>
  <% }) %>
</ul>
<%- include('../partials/footer') %>
```

```html
<!-- views/users/detail.ejs -->
<%- include('../partials/header') %>
<h1>Dettagli di <%= user.username %></h1>
<h2>Post di <%= user.username %>:</h2>
<ul>
  <% posts.forEach(p => { %>
    <li><a href="/posts/<%= p.id %>"><%= p.title %></a></li>
  <% }) %>
</ul>
<%- include('../partials/footer') %>
```

### 3.2) Route & view per post e commenti

#### 3.2.1) `routes/posts.js`

```js
// File: routes/posts.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Lista post dell’utente loggato
router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  db.all('SELECT * FROM posts WHERE user_id = ?', [req.session.user.id], (err, posts) => {
    res.render('posts/list', { posts });
  });
});

// Form per nuovo post
router.get('/new', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  res.render('posts/new');
});

router.post('/new', (req, res) => {
  const { title, body } = req.body;
  db.run('INSERT INTO posts(user_id,title,body) VALUES(?,?,?)',
    [req.session.user.id, title, body],
    function() {
      res.redirect('/posts');
    });
});

// Mostra singolo post + commenti
router.get('/:id', (req, res) => {
  const pid = req.params.id;
  db.get(`SELECT posts.*, users.username
          FROM posts JOIN users ON posts.user_id=users.id
          WHERE posts.id = ?`, [pid], (err, post) => {
    db.all(`SELECT comments.*, users.username FROM comments
            JOIN users ON comments.user_id=users.id
            WHERE comments.post_id = ?`, [pid], (err, comments) => {
      res.render('posts/show', { post, comments });
    });
  });
});

// Aggiungi commento
router.post('/:id/comments', (req, res) => {
  const pid = req.params.id;
  const uid = req.session.user.id;
  const { body } = req.body;
  db.run('INSERT INTO comments(post_id,user_id,body) VALUES(?,?,?)',
    [pid, uid, body],
    () => res.redirect(`/posts/${pid}`));
});

module.exports = router;
```

#### 3.2.2) View post

```html
<!-- views/posts/list.ejs -->
<%- include('../partials/header') %>
<h1>I miei post</h1>
<a href="/posts/new">Crea nuovo post</a>
<ul>
  <% posts.forEach(p=>{ %>
    <li><a href="/posts/<%= p.id %>"><%= p.title %></a></li>
  <% }) %>
</ul>
<%- include('../partials/footer') %>
```

```html
<!-- views/posts/new.ejs -->
<%- include('../partials/header') %>
<h1>Crea nuovo post</h1>
<form action="/posts/new" method="post">
  <label>Titolo:<input name="title"/></label><br/>
  <label>Contenuto:<textarea name="body"></textarea></label><br/>
  <button type="submit">Pubblica</button>
</form>
<%- include('../partials/footer') %>
```

```html
<!-- views/posts/show.ejs -->
<%- include('../partials/header') %>
<h1><%= post.title %> di <%= post.username %></h1>
<p><%= post.body %></p>
<hr/>
<h2>Commenti</h2>
<ul>
  <% comments.forEach(c=>{ %>
    <li>
      <strong><%= c.username %></strong> (<%= c.inserted_at %>):<br/>
      <%= c.body %>
    </li>
  <% }) %>
</ul>

<% if (currentUser) { %>
  <form action="/posts/<%= post.id %>/comments" method="post">
    <textarea name="body" placeholder="Il tuo commento"></textarea><br/>
    <button type="submit">Aggiungi commento</button>
  </form>
<% } else { %>
  <p>Devi <a href="/auth/login">accedere</a> per commentare.</p>
<% } %>
<%- include('../partials/footer') %>
```

---

## 4) Avviare l’app e test

1. **Avviare il server**
   Dalla cartella principale:

   ```bash
   node app.js
   ```

   Vedrai in console: `Server avviato su http://localhost:3000`

2. **Testare nel browser**

   * Vai su `http://localhost:3000/`
   * Registrati (`/auth/signup`), accedi (`/auth/login`)
   * Crea post (`/posts/new`), visualizza elenco (`/posts`)
   * Vai su `/users` per vedere tutti gli utenti e i loro post
   * Click su un post per aggiungere commenti

---

## 5) Conclusione & panoramica

Hai appena creato, **da zero**, un’applicazione Node.js con:

* **Autenticazione** (registrazione, login, logout)
* **Gestione utenti** (lista + dettaglio con i loro post)
* **Blog** (creazione, visualizzazione dei post)
* **Commenti** (agli altri post, con autore e timestamp)
* **Database SQLite** per memorizzare dati persistenti
* **EJS + express-ejs-layouts** per template HTML dinamici

Da qui potrai:

* Migliorare la sicurezza (hash delle password)
* Aggiungere validazioni dettagliate
* Passare a DB più potenti (PostgreSQL, MySQL)
* Implementare paginazione, ricerche, upload di immagini

Buon divertimento nello sviluppo!
