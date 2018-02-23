var router = require('express').Router();
var mongoose = require('mongoose');
var Article = mongoose.Schema.Article;
var passport = require('passport'); // TODO why is this needed?
var auth = require('../auth');



module.exports = router;