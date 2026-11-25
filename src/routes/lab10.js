const express = require('express');
const router = express.Router();
const config = require('../config');

// Product page with store inventory check
router.get('/', (req, res) => {
  // Set lab flag cookie for CTF challenge verification
  res.cookie('flag', config.flags.lab10, {
    httpOnly: false,
    path: '/lab10',
    sameSite: 'lax'
  });

  const productId = parseInt(req.query.productId, 10) || 1;
  const storeStock = req.query.stock !== undefined ? parseInt(req.query.stock, 10) : null;

  const product = {
    id: productId,
    name: 'Hardware Security Key (FIDO2 / U2F)',
    price: '$49.99',
    description: 'Enterprise-grade physical authentication key supporting WebAuthn, FIDO2, and U2F protocols for robust multi-factor authentication.',
    stores: ['London', 'Paris', 'Milan']
  };

  res.render('lab10', {
    product,
    storeStock
  });
});

router.post('/check-stock', (req, res) => {
  const storeId = req.body.storeId ? encodeURIComponent(req.body.storeId) : '';
  const stock = Math.floor(Math.random() * 25) + 3;
  res.redirect(`/lab10?productId=1&storeId=${storeId}&stock=${stock}`);
});

module.exports = router;
