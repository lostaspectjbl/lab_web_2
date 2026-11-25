const express = require('express');
const router = express.Router();
const { db, resetDatabase } = require('../db');
const config = require('../config');

// Helper to encode double quotes for the website attribute context
function encodeDoubleQuotes(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;');
}

router.get('/', (req, res) => {
  // Set lab flag cookie for CTF challenge verification
  res.cookie('flag', config.flags.lab08, {
    httpOnly: false,
    path: '/lab08',
    sameSite: 'lax'
  });

  // Parameterized query to fetch post and its comments
  const post = db.prepare('SELECT id, title, content, author, created_at FROM posts WHERE id = ?').get(1);
  if (!post) {
    return res.status(404).send('Post not found');
  }

  const comments = db.prepare(
    'SELECT id, author, website, content, created_at FROM comments WHERE post_id = ? ORDER BY id ASC'
  ).all(1);

  res.render('lab08', {
    post,
    comments
  });
});

router.post('/comment', (req, res) => {
  const { postId, author, website, content } = req.body;
  const targetPostId = parseInt(postId, 10) || 1;

  if (author && content) {
    // Double quotes are HTML-encoded, but URL scheme is NOT validated
    const encodedWebsite = encodeDoubleQuotes(String(website || '').trim());

    // Strictly parameterized insert query into SQLite
    const stmt = db.prepare(
      'INSERT INTO comments (post_id, author, website, content) VALUES (?, ?, ?, ?)'
    );
    stmt.run(targetPostId, String(author).slice(0, 100), encodedWebsite, String(content));
  }

  res.redirect('/lab08');
});

router.post('/reset', (req, res) => {
  resetDatabase();
  res.redirect('/lab08');
});

module.exports = router;
