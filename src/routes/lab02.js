const express = require('express');
const router = express.Router();
const { db, resetDatabase } = require('../db');
const config = require('../config');

// Lab 02: Stored XSS — article page with vulnerable comment section
// Comments are stored and rendered without output encoding (<%- %>)
router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab02, {
    httpOnly: false,
    path: '/lab02',
    sameSite: 'lax'
  });

  // Use post #2 (Stored vs. Reflected XSS article) as the article context
  const post = db.prepare(
    'SELECT id, title, slug, category, excerpt, content, author, author_key, read_time, created_at FROM posts WHERE id = ?'
  ).get(2);

  if (!post) return res.status(404).send('Article not found');

  const comments = db.prepare(
    'SELECT id, author, website, content, created_at FROM comments WHERE post_id = ? ORDER BY id ASC'
  ).all(2);

  res.render('lab02', { post, comments });
});

// Post a new comment (stored without output encoding)
router.post('/comment', (req, res) => {
  const { author, content } = req.body;
  if (author && content) {
    // Parameterized insert — no SQLi; content is NOT sanitized (intentional XSS sink)
    db.prepare(
      'INSERT INTO comments (post_id, author, website, content) VALUES (?, ?, ?, ?)'
    ).run(2, String(author).slice(0, 100), '', String(content));
  }
  res.redirect('/lab02');
});

// Reset endpoint
router.post('/reset', (req, res) => {
  resetDatabase();
  res.redirect('/lab02');
});

module.exports = router;
