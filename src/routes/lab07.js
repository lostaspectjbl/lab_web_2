const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

// Lab 07: Reflected XSS into HTML attribute — angle brackets encoded, quotes not
function encodeAngleBracketsOnly(str) {
  if (!str) return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab07, {
    httpOnly: false,
    path: '/lab07',
    sameSite: 'lax'
  });

  const rawSearch = req.query.search !== undefined ? String(req.query.search) : '';

  let posts = [];
  if (rawSearch.trim() !== '') {
    const term = `%${rawSearch}%`;
    posts = db.prepare(
      'SELECT id, title, slug, category, excerpt, author, read_time FROM posts WHERE title LIKE ? OR content LIKE ? ORDER BY id DESC'
    ).all(term, term);
  }

  // Angle brackets HTML-encoded, single/double quotes left raw
  const search = encodeAngleBracketsOnly(rawSearch);

  res.render('lab07', { search, posts });
});

module.exports = router;
