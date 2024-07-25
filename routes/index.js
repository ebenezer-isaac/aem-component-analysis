const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get('/', function(req, res) {
  res.render('index');
});

router.post('/', function(req, res) {
  const location = req.body.location;
  if (fs.existsSync(location) && fs.lstatSync(location).isDirectory()) {
    fs.readdir(path.resolve(location), (err, files) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send(files);
      }
    });
  } else {
    res.status(400).send('Invalid directory');
  }
});

module.exports = router;