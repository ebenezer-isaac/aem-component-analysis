const express = require('express');
const fs = require('fs');
const router = express.Router();

router.post('/', (req, res) => {
    const location = req.body.location;
    const directoryExists = fs.existsSync(location) && fs.lstatSync(location).isDirectory() ? 1 : 0;
    res.status(200).send({ directoryExists });
});

module.exports = router;