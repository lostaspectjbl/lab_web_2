const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

// Lab 09: Reflected XSS into JavaScript string — angle brackets encoded, quotes/backslash not
const LAB_META = { num: '09', title: 'Reflected XSS — JavaScript String Context' };

function encodeAngleBracketsOnly(str) {
  if (!str) return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab09, {
    httpOnly: false,
    path: '/lab09',
    sameSite: 'lax'
  });

  const rawSearch = req.query.search !== undefined ? String(req.query.search) : '';

  let posts = [];
  if (rawSearch.trim() !== '') {
    const term = `%${rawSearch}%`;
    posts = db.prepare(
      'SELECT id, title, slug, category, excerpt, author, read_time FROM posts WHERE title LIKE ? OR content LIKE ? ORDER BY id DESC'
    ).all(term, term);
  } else {
    posts = db.prepare(
      'SELECT id, title, slug, category, excerpt, author, read_time FROM posts ORDER BY id DESC'
    ).all();
  }

  // Angle brackets encoded; single quotes and backslash are NOT escaped (intentional JS string sink)
  const search = encodeAngleBracketsOnly(rawSearch);

  res.render('lab09', {
    search, rawSearch, posts,
    labNum: LAB_META.num, labTitle: LAB_META.title,
    sessionId: req.session.id,
    resetPath: '/lab09/reset'
  });
});

router.post('/reset', (req, res) => { res.redirect('/lab09'); });

module.exports = router;
