const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

// Lab 03: DOM XSS via document.write — search page with analytics tracker
const LAB_META = { num: '03', title: 'DOM XSS — document.write' };

router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab03, {
    httpOnly: false,
    path: '/lab03',
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

  res.render('lab03', {
    search, posts,
    labNum: LAB_META.num, labTitle: LAB_META.title,
    sessionId: req.session.id,
    resetPath: '/lab03/reset'
  });
});

router.post('/reset', (req, res) => { res.redirect('/lab03'); });

module.exports = router;
