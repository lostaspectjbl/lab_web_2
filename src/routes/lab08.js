const express = require('express');
const router = express.Router();
const { db, resetSession } = require('../db');
const config = require('../config');

// Lab 08: Stored XSS in href attribute — double quotes encoded, URL scheme NOT validated.
// Comments are ISOLATED per session.
const LAB_META = { num: '08', title: 'Stored XSS — Href Attribute (javascript: scheme)' };

function encodeDoubleQuotes(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;');
}

router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab08, {
    httpOnly: false,
    path: '/lab08',
    sameSite: 'lax'
  });

  const post = db.prepare(
    'SELECT id, title, slug, category, excerpt, content, author, author_key, read_time, created_at FROM posts WHERE id = ?'
  ).get(4);
  if (!post) return res.status(404).send('Article not found');

  // Show seed comments + this session's own comments only
  const comments = db.prepare(
    `SELECT id, author, website, content, created_at FROM comments
     WHERE post_id = ? AND (session_id = ? OR session_id = 'seed')
     ORDER BY id ASC`
  ).all(4, req.session.id);

  res.render('lab08', {
    post, comments,
    labNum: LAB_META.num, labTitle: LAB_META.title,
    sessionId: req.session.id,
    resetPath: '/lab08/reset'
  });
});

router.post('/comment', (req, res) => {
  const { author, website, content } = req.body;
  if (author && content) {
    // Double quotes encoded in website, scheme NOT validated (intentional sink) — isolated by session_id
    const encodedWebsite = encodeDoubleQuotes(String(website || '').trim());
    db.prepare(
      'INSERT INTO comments (post_id, session_id, author, website, content) VALUES (?, ?, ?, ?, ?)'
    ).run(4, req.session.id, String(author).slice(0, 100), encodedWebsite, String(content).slice(0, 1000));
  }
  res.redirect('/lab08');
});

// Per-session reset
router.post('/reset', (req, res) => {
  resetSession(req.session.id);
  res.redirect('/lab08');
});

module.exports = router;
