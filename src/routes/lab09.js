const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

// Helper for Lab 09: Encodes angle brackets to prevent closing the <script> tag, but leaves single quotes and backslashes unhandled
function encodeAngleBracketsOnly(str) {
  if (!str) return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

router.get('/', (req, res) => {
  // Set lab flag cookie for CTF challenge verification
  res.cookie('flag', config.flags.lab09, {
    httpOnly: false,
    path: '/lab09',
    sameSite: 'lax'
  });

  const rawSearch = req.query.search !== undefined ? String(req.query.search) : null;
  let results = [];

  if (rawSearch !== null && rawSearch.trim() !== '') {
    // Parameterized search query
    const stmt = db.prepare('SELECT id, title, content FROM posts WHERE title LIKE ? OR content LIKE ?');
    const term = `%${rawSearch}%`;
    results = stmt.all(term, term);
  }

  // Reflected into JS string: angle brackets encoded, quotes/backslashes unhandled
  const searchVal = rawSearch !== null ? encodeAngleBracketsOnly(rawSearch) : null;

  res.render('lab09', {
    search: searchVal,
    results
  });
});

module.exports = router;
