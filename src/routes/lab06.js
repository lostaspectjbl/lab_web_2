const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

// Lab 06: DOM XSS in jQuery hashchange selector — Blog archive page
const LAB_META = { num: '06', title: 'DOM XSS — jQuery Selector Injection' };

router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab06, {
    httpOnly: false,
    path: '/lab06',
    sameSite: 'lax'
  });

  const posts = db.prepare(
    'SELECT id, title, slug, category, excerpt, author, read_time, created_at FROM posts ORDER BY id ASC'
  ).all();

  res.render('lab06', {
    posts,
    helperUrl: `${config.helperHost}/helper`,
    labNum: LAB_META.num, labTitle: LAB_META.title,
    sessionId: req.session.id,
    resetPath: '/lab06/reset'
  });
});

router.post('/reset', (req, res) => { res.redirect('/lab06'); });

module.exports = router;
