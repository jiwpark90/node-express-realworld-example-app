/*
    1. Intercepting URL params
    2. Utilizing promise all
    3. populate() expands on the foreign key
    4. Interesting way to leverage Promise.resolve() to get optional user
       in get all comments
    5. You can get fancy with populate() with options. Look at get comments

    Q: What is 'populate'? execPopulate()?
    A: what is for sure is that execPopulate() returns a promise that can
       also be passed a callback fxn. What isn't clear is what the difference
       between doing that and populate() is, since populate() also seems to
       return a promise (in the middleware, it does a .then() on it)
       OBSERVATION: you can .then() a .populate() only if the .populate()'ing
       on some query. If you have an object, you need to use execPopulate()
       to get a promise
    
*/

var router = require('express').Router();
var mongoose = require('mongoose');
var Article = mongoose.model('Article');
var User = mongoose.model('User');
var Comment = mongoose.model('Comment');
var passport = require('passport'); // TODO why is this needed?
var auth = require('../auth');

// middleware to handle the article URL param
router.param('article', function(req, res, next, slug) {
    Article.findOne({ slug: slug })
        // expands the author field with the referenced User
        .populate('author')
        .then(function(article) {
            if (!article) {
                return res.sendStatus(404);
            }

            req.article = article;
            return next();
        }).catch(next);
});

// middleware to resolve the comment
router.param('comment', function(req, res, next, commentId) {
    Comment.findById(commentId).then(function(comment) {
        if (!comment) {
            res.sendStatus(404);
        }

        req.comment = comment;

        return next();
    }).catch(next);
});

// SAVE article
router.post('/', auth.required, function(req, res, next) {
    User.findById(req.payload.id).then(function(user) {
        if (!user) {
            // unauthenticated - means authentication itself
            // is problematic vs. the authenticated user
            // not being authroized for something
            return res.sendStatus(401);
        }

        // TODO how to verify that the model is valid?
        var article = new Article(req.body.article);
        article.author = user;

        // TODO what if the save fails?
        return article.save().then(function() {
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
        // execPopulate() returns a promise. you can also pass a callback fxn
        req.article.populate('author').execPopulate()
    ]).then(function(results) {
        // what if the find errors out?
        // in User.toProfileJSON, it just does a reference
        // to its properties. won't that crash?
        var user = results[0];

        return res.json({ article : req.article.toJSONFor(user)});
    }).catch(next);
});

// favorite an article
router.post('/:article/favorite', auth.required, function(req, res, next) {
    var articleId = req.article._id;

    User.findById(req.payload.id).then(function(currentUser) {
        if (!currentUser) {
            // problem with authentication
            res.sendStatus(401);
        }

        return currentUser.favorite(articleId).then(function(loluser) {
            // updateFavoriteCount() returns save(), which is a promise
            return req.article.updateFavoriteCount().then(function(article) {
                return res.json({article: article.toJSONFor(currentUser)});
            });
        });
    }).catch(next);
});

// unfavorite an article
router.delete('/:article/unfavorite', auth.required, function(req, res, next) {
    var articleId = req.article._id;

    User.findById(req.payload.id).then(function(currentUser) {
        if (!currentUser) {
            // authentication problem
            res.sendStatus(401);
        }

        return currentUser.unfavorite(articleId).then(function() {
            return req.article.updateFavoriteCount().then(function(article) {
                return res.json({article: article.toJSONFor(currentUser)});
            });
        });
    }).catch(next);
});

// DELETE an article
router.delete('/:article', auth.required, function(req, res, next) {
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

// CREATE a comment
router.post('/:article/comments', auth.required, function(req, res, next) {
    User.findById(req.payload.id).then(function(currentUser) {
        if (!currentUser) {
            // unauthenticated
            res.sendStatus(401);
        }
        
        var comment = new Comment(req.body.comment);
        // setting the reference's _id doesn't work.
        // also, even if you mutate the object beforehand,
        // it will ignore
        comment.article = req.article;
        comment.author = currentUser;
        return comment.save().then(function() {
            req.article.comments = req.article.comments.concat([comment]);
            return req.article.save().then(function(article) {
                res.json({comment: comment.toJSONFor(currentUser)});
            });
        });
    }).catch(next);
});

// GET comments
router.get('/:article/comments', auth.optional, function(req, res, next) {
    Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function(currentUser) {
        req.article.populate({
            path: 'comments',
            populate: {
                path: 'author'
            },
            options: {
                sort: {
                    createdAt: 'desc'
                }
            }
        }).execPopulate().then(function(article) {
            return res.json({
                comments: article.comments.map(function(comment) {
                    return comment.toJSONFor(currentUser);
                })
            });
        });
    });
});

// DELETE comment
router.delete('/:article/comments/:comment', auth.required, function(req, res, next) {
    if (req.payload.id.toString() === req.comment.author.toString()) {
        req.article.comments.remove(req.comment._id);
        req.article.save()
            .then(function() {
                return Comment.findById(req.comment._id).remove().exec();
            })
            .then(function() {
                // request successful, and returns no content
                res.sendStatus(204);
            });
    } else {
        // forbidden
        res.sendStatus(403);
    }
});

module.exports = router;