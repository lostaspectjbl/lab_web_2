const express = require('express');
const router = express.Router();
const { db, resetDatabase } = require('../db');
const config = require('../config');

// Lab 08: Stored XSS in href attribute — double quotes encoded, URL scheme not validated
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

  // Use post #4 (jQuery Legacy Trap) as the article context
  const post = db.prepare(
    'SELECT id, title, slug, category, excerpt, content, author, author_key, read_time, created_at FROM posts WHERE id = ?'
  ).get(4);

  if (!post) return res.status(404).send('Article not found');

  const comments = db.prepare(
    'SELECT id, author, website, content, created_at FROM comments WHERE post_id = ? ORDER BY id ASC'
  ).all(4);

  res.render('lab08', { post, comments });
});

router.post('/comment', (req, res) => {
  const { author, website, content } = req.body;
  if (author && content) {
    // Double quotes encoded in website, but URL scheme is NOT validated (intentional sink)
    const encodedWebsite = encodeDoubleQuotes(String(website || '').trim());
    db.prepare(
      'INSERT INTO comments (post_id, author, website, content) VALUES (?, ?, ?, ?)'
    ).run(4, String(author).slice(0, 100), encodedWebsite, String(content).slice(0, 1000));
  }
  res.redirect('/lab08');
});

router.post('/reset', (req, res) => {
  resetDatabase();
  res.redirect('/lab08');
});

module.exports = router;
