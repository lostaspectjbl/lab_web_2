const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

// Specific custom encoder for Lab 07: Angle brackets are HTML-encoded, quotes are left unencoded
function encodeAngleBracketsOnly(str) {
  if (!str) return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

router.get('/', (req, res) => {
  // Set lab flag cookie for CTF challenge verification
  res.cookie('flag', config.flags.lab07, {
    httpOnly: false,
    path: '/lab07',
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

  // Value reflected into attribute with angle brackets encoded but quotes intact
  const searchVal = rawSearch !== null ? encodeAngleBracketsOnly(rawSearch) : null;

  res.render('lab07', {
    search: searchVal,
    results
  });
});

module.exports = router;
