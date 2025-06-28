// backend/src/routes/portfolio.js
const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Portfolio routes working' });
});

module.exports = router;