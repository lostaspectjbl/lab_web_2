const express = require('express');
const router = express.Router();
const config = require('../config');

// Lab 05: DOM XSS in jQuery anchor href — Contact/Feedback page
router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab05, {
    httpOnly: false,
    path: '/lab05',
    sameSite: 'lax'
  });

  const submitted = req.query.submitted === 'true';
  res.render('lab05', { submitted });
});

// Process feedback submission
router.post('/feedback', (req, res) => {
  // Redirect back; jQuery in the template handles setting the Back button href
  res.redirect('/lab05?submitted=true');
});

module.exports = router;
