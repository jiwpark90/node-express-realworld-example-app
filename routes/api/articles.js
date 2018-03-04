/*
    1. Intercepting URL params
    2. Utilizing promise all
Q:
    1. What is 'populate'? execPopulate()?
*/

var router = require('express').Router();
var mongoose = require('mongoose');
var Article = mongoose.model('Article');
var User = mongoose.model('User');
var passport = require('passport'); // TODO why is this needed?
var auth = require('../auth');

// middleware to handle the article URL param
router.param('article', function(req, res, next, slug) {
    Article.findOne({ slug: slug })
        // TODO what is this??
        // guessing that it automatically 'expands'
        // the author field with the referenced User
        .populate('author')
        .then(function(article) {
            if (!article) {
                return res.sendStatus(404);
            }

            req.article = article;
            return next();
        }).catch(next);
});

// SAVE article
router.post('/', auth.required, function(req, res, next) {
    User.findById(req.payload.id).then(function(user) {
        if (!user) {
            // unauthorized - means authentication itself
            // is problematic vs. the authenticated user
            // not being authroized for something
            return res.sendStatus(401);
        }

        // TODO how to verify that the model is valid?
        var article = new Article(req.body.article);
        article.author = user;

        // TODO what if the save fails?
        return article.save().then(function() {
            console.log(article.author);
            return res.json({article: article.toJSONFor(user)});
        });
    }).catch(next);
});

// UPDATE article
router.put('/:article', auth.required, function(req, res, next) {
    User.findById(req.payload.id).then(function(user) {
        // what if any of these are undefined
        if (req.article.author._id.toString() === req.payload.id.toString()) {
            if (typeof req.body.article.title !== 'undefined') {
                // req.article is the article object that 
                // was fetched by the middleware
                req.article.title = req.body.article.title;
            }

            if (typeof req.body.article.description !== 'undefined') {
                req.article.description = req.body.article.description;
            }

            if (typeof req.body.article.body !== 'undefined') {
                req.article.body = req.body.article.body;
            }

            req.article.save().then(function(article) {
                return res.json({ article: article.toJSONFor(user) });
            }).catch(next);
        } else {
            // unauthorized
            return res.sendStatus(403);
        }
    });
});

// GET article
// need to explicitly populate the author object before returning
router.get('/:article', auth.optional, function(req, res, next) {
    Promise.all([
        // payload will be populated if signed in
        req.payload ? User.findById(req.payload.id) : null,
        // TODO?? is this connected to the middleware?
        req.article.populate('author').execPopulate()
    ]).then(function(results) {
        // what if the find errors out?
        // in User.toProfileJSON, it just does a reference
        // to its properties. won't that crash?
        var user = results[0];

        return res.json({ article : req.article.toJSONFor(user)});
    }).catch(next);
});

router.delete('/:aticle', auth.required, function(req, res, next) {
    User.findById(req.payload.id).then(function() {
        if (req.article.author._id.toString() === req.payload.id.toString()) {
            return req.article.remove().then(function() {
                // request successful, and returns no content
                return res.sendStatus(204);
            });
        } else {
            // forbidden
            return res.sendStatus(403);
        }
    });
});

module.exports = router;