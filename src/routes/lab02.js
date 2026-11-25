const express = require('express');
const router = express.Router();
const { db, resetSession } = require('../db');
const config = require('../config');

// Lab 02: Stored XSS — article page with vulnerable comment section
// Comments are ISOLATED per session: each user sees only their own comments + seed comments.
// Content is rendered with <%- %> (unescaped) — intentional XSS sink.

router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab02, {
    httpOnly: false,
    path: '/lab02',
    sameSite: 'lax'
  });

  const post = db.prepare(
    'SELECT id, title, slug, category, excerpt, content, author, author_key, read_time, created_at FROM posts WHERE id = ?'
  ).get(2);
  if (!post) return res.status(404).send('Article not found');

  // Show seed comments (always visible) + this session's own comments
  const comments = db.prepare(
    `SELECT id, author, website, content, created_at FROM comments
     WHERE post_id = ? AND (session_id = ? OR session_id = 'seed')
     ORDER BY id ASC`
  ).all(2, req.session.id);

  res.render('lab02', { post, comments });
});

router.post('/comment', (req, res) => {
  const { author, content } = req.body;
  if (author && content) {
    // Stored WITHOUT sanitization (intentional XSS sink) — isolated by session_id
    db.prepare(
      'INSERT INTO comments (post_id, session_id, author, website, content) VALUES (?, ?, ?, ?, ?)'
    ).run(2, req.session.id, String(author).slice(0, 100), '', String(content));
  }
  res.redirect('/lab02');
});

// Per-session reset: clears only this user's comments
router.post('/reset', (req, res) => {
  resetSession(req.session.id);
  res.redirect('/lab02');
});

module.exports = router;
