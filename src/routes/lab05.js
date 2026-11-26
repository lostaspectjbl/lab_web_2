const express = require('express');
const router = express.Router();
const config = require('../config');

// Lab 05: DOM XSS in jQuery anchor href — Contact/Feedback page
const LAB_META = { num: '05', title: 'DOM XSS — jQuery href Injection' };

router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab05, {
    httpOnly: false,
    path: '/lab05',
    sameSite: 'lax'
  });

  const submitted = req.query.submitted === 'true';
  res.render('lab05', {
    submitted,
    labNum: LAB_META.num, labTitle: LAB_META.title,
    sessionId: req.session.id,
    resetPath: '/lab05/reset'
  });
});

// Process feedback submission
router.post('/feedback', (req, res) => {
  res.redirect('/lab05?submitted=true');
});

router.post('/reset', (req, res) => { res.redirect('/lab05'); });

module.exports = router;
