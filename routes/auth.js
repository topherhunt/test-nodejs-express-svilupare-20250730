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