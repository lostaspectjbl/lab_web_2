const express = require('express');
const router = express.Router();
const { db, resetDatabase } = require('../db');
const config = require('../config');

// Display blog post and comments
router.get('/', (req, res) => {
  // Set lab flag cookie for CTF challenge verification
  res.cookie('flag', config.flags.lab02, {
    httpOnly: false,
    path: '/lab02',
    sameSite: 'lax'
  });

  // Strictly parameterized queries
  const post = db.prepare('SELECT id, title, content, author, created_at FROM posts WHERE id = ?').get(1);
  if (!post) {
    return res.status(404).send('Post not found');
  }

  const comments = db.prepare(
    'SELECT id, author, website, content, created_at FROM comments WHERE post_id = ? ORDER BY id ASC'
  ).all(1);

  res.render('lab02', {
    post,
    comments
  });
});

// Post a new comment
router.post('/comment', (req, res) => {
  const { postId, author, content } = req.body;
  const targetPostId = parseInt(postId, 10) || 1;

  if (author && content) {
    // Strictly parameterized insert query
    const stmt = db.prepare(
      'INSERT INTO comments (post_id, author, website, content) VALUES (?, ?, ?, ?)'
    );
    stmt.run(targetPostId, String(author).slice(0, 100), '', String(content));
  }

  res.redirect('/lab02');
});

// Reset comments endpoint
router.post('/reset', (req, res) => {
  resetDatabase();
  res.redirect('/lab02');
});

module.exports = router;
