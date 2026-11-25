const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

router.get('/', (req, res) => {
  // Set lab flag cookie for CTF challenge verification
  res.cookie('flag', config.flags.lab01, {
    httpOnly: false,
    path: '/lab01',
    sameSite: 'lax'
  });

  const search = req.query.search !== undefined ? String(req.query.search) : null;

  // Fetch posts for the sidebar and results list
  let posts = [];
  if (search !== null && search.trim() !== '') {
    // Strictly parameterized SQL query — no SQLi possible
    const term = `%${search}%`;
    posts = db.prepare(
      'SELECT id, title, slug, category, excerpt, author, read_time FROM posts WHERE title LIKE ? OR content LIKE ? ORDER BY id DESC'
    ).all(term, term);
  }

  const recent = db.prepare(
    'SELECT id, title, author, read_time FROM posts ORDER BY id DESC LIMIT 5'
  ).all();

  res.render('lab01', { search, posts, recent });
});

module.exports = router;
