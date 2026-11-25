const express = require('express');
const router = express.Router();
const config = require('../config');

// Display feedback page
router.get('/', (req, res) => {
  // Set lab flag cookie for CTF challenge verification
  res.cookie('flag', config.flags.lab05, {
    httpOnly: false,
    path: '/lab05',
    sameSite: 'lax'
  });

  const returnPath = req.query.returnPath !== undefined ? String(req.query.returnPath) : '/';
  const submitted = req.query.submitted === 'true';

  res.render('lab05', {
    returnPath,
    submitted
  });
});

// Process feedback submission
router.post('/feedback', (req, res) => {
  const returnPath = req.body.returnPath ? encodeURIComponent(req.body.returnPath) : '/';
  // Simulate processing feedback
  res.redirect(`/lab05?submitted=true&returnPath=${returnPath}`);
});

module.exports = router;
