// place to register all the API routes

var router = require('express').Router();

// register the users route
// uses '/' because the /user(s) is defined
// in users.js
router.use('/', require('./users'));
router.use('/profiles', require('./profiles'));
router.use('/articles', require('./articles'));

module.exports = router;
