var router = require('express').Router();

// register the users route
router.use('/', require('./users'));

module.exports = router;
