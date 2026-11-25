const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

router.get('/', (req, res) => {
  // Set lab flag cookie for CTF challenge verification
  res.cookie('flag', config.flags.lab04, {
    httpOnly: false,
    path: '/lab04',
    sameSite: 'lax'
  });

  const search = req.query.search !== undefined ? String(req.query.search) : null;
  let results = [];

  if (search !== null && search.trim() !== '') {
    // Strictly parameterized SQL query
    const stmt = db.prepare('SELECT id, title, content FROM posts WHERE title LIKE ? OR content LIKE ?');
    const term = `%${search}%`;
    results = stmt.all(term, term);
  }

  res.render('lab04', {
    search,
    results
  });
});

module.exports = router;
