const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

router.get('/', (req, res) => {
  // Set lab flag cookie for CTF challenge verification
  res.cookie('flag', config.flags.lab06, {
    httpOnly: false,
    path: '/lab06',
    sameSite: 'lax'
  });

  // Parameterized query to retrieve blog posts
  const posts = db.prepare('SELECT id, title, content, author, created_at FROM posts ORDER BY id ASC').all();

  res.render('lab06', {
    posts,
    helperUrl: `${config.helperHost}/helper`
  });
});

module.exports = router;
