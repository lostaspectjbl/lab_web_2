const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

const LAB_META = { num: '01', title: 'Reflected XSS — HTML Context' };

router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab01, {
    httpOnly: false,
    path: '/lab01',
    sameSite: 'lax'
  });

  const search = req.query.search !== undefined ? String(req.query.search) : null;

  let posts = [];
  if (search !== null && search.trim() !== '') {
    const term = `%${search}%`;
    posts = db.prepare(
      'SELECT id, title, slug, category, excerpt, author, read_time FROM posts WHERE title LIKE ? OR content LIKE ? ORDER BY id DESC'
    ).all(term, term);
  }

  const recent = db.prepare(
    'SELECT id, title, slug, category, excerpt, author, read_time FROM posts ORDER BY id DESC LIMIT 6'
  ).all();

  res.render('lab01', {
    search, posts, recent,
    labNum: LAB_META.num, labTitle: LAB_META.title,
    sessionId: req.session.id,
    resetPath: '/lab01/reset'
  });
});

// Per-session reset (stateless lab — just reloads cleanly)
router.post('/reset', (req, res) => {
  res.redirect('/lab01');
});

module.exports = router;
