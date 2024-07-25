const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const location = req.body.location;

  res.render('performAnalysis', { location });
});

module.exports = router;