const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab01, {
    httpOnly: false,
    path: '/lab01',
    sameSite: 'lax'
  });

  const search = req.query.search !== undefined ? String(req.query.search) : null;

  // Posts from search query
  let posts = [];
  if (search !== null && search.trim() !== '') {
    const term = `%${search}%`;
    posts = db.prepare(
      'SELECT id, title, slug, category, excerpt, author, read_time FROM posts WHERE title LIKE ? OR content LIKE ? ORDER BY id DESC'
    ).all(term, term);
  }

  // Recent articles always shown in sidebar and default state
  const recent = db.prepare(
    'SELECT id, title, slug, category, excerpt, author, read_time FROM posts ORDER BY id DESC LIMIT 6'
  ).all();

  res.render('lab01', { search, posts, recent });
});

module.exports = router;
