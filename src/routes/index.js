const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Homepage
router.get('/', (req, res) => {
  res.render('index');
});

// Articles listing
router.get('/articles', (req, res) => {
  const posts = db.prepare(
    'SELECT id, title, slug, category, excerpt, author, author_key, read_time, created_at FROM posts ORDER BY id DESC'
  ).all();
  res.render('articles', { posts });
});

// Single article view (non-vulnerable — safe rendering for the real blog)
router.get('/articles/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(404).send('Article not found');

  const post = db.prepare(
    'SELECT id, title, slug, category, excerpt, content, author, author_key, read_time, created_at FROM posts WHERE id = ?'
  ).get(id);
  if (!post) return res.status(404).send('Article not found');

  const comments = db.prepare(
    'SELECT id, author, website, content, created_at FROM comments WHERE post_id = ? ORDER BY id ASC'
  ).all(id);

  res.render('article', { post, comments });
});

// Comment POST on real article pages (safe — no XSS here)
router.post('/articles/:id/comment', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { author, website, content } = req.body;
  if (id && author && content) {
    const stmt = db.prepare(
      'INSERT INTO comments (post_id, author, website, content) VALUES (?, ?, ?, ?)'
    );
    // Safe: website is validated and HTML-encoded for the non-lab comment form
    const safeWebsite = String(website || '').trim().slice(0, 200);
    const allowedScheme = safeWebsite.match(/^https?:\/\//i) ? safeWebsite : '';
    stmt.run(id, String(author).slice(0, 80), allowedScheme, String(content).slice(0, 1000));
  }
  res.redirect('/articles/' + id);
});

// Shop listing
router.get('/shop', (req, res) => {
  res.render('shop');
});

// About page
router.get('/about', (req, res) => {
  res.render('about');
});

// Contact GET
router.get('/contact', (req, res) => {
  res.render('contact');
});

// Contact POST (safe — just redirects with a message)
router.post('/contact', (req, res) => {
  res.render('contact', { message: 'Thanks for your message! We will get back to you within two business days.' });
});

// Site-wide search (safe, non-lab)
router.get('/search', (req, res) => {
  const query = req.query.q ? String(req.query.q).slice(0, 200) : '';
  let results = [];
  if (query.trim()) {
    const term = `%${query}%`;
    results = db.prepare(
      'SELECT id, title, category, excerpt, author, read_time FROM posts WHERE title LIKE ? OR excerpt LIKE ? OR content LIKE ? ORDER BY id DESC'
    ).all(term, term, term);
  }
  res.render('search', { query, results });
});

module.exports = router;
