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