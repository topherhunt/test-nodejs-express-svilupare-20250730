// File: routes/posts.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Lista post dell'utente loggato
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