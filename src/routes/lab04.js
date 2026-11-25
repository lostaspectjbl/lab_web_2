const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

// Lab 04: DOM XSS via innerHTML — search page with dynamic results banner
router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab04, {
    httpOnly: false,
    path: '/lab04',
    sameSite: 'lax'
  });

  const search = req.query.search !== undefined ? String(req.query.search) : '';

  let posts = [];
  if (search.trim() !== '') {
    const term = `%${search}%`;
    posts = db.prepare(
      'SELECT id, title, slug, category, excerpt, author, read_time FROM posts WHERE title LIKE ? OR content LIKE ? ORDER BY id DESC'
    ).all(term, term);
  } else {
    posts = db.prepare(
      'SELECT id, title, slug, category, excerpt, author, read_time FROM posts ORDER BY id DESC'
    ).all();
  }

  res.render('lab04', { search, posts });
});

module.exports = router;
