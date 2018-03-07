/*
    1. intercepting URL param
*/
var router = require('express').Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var auth = require('../auth');

// middleware to handle the username param in the GET request
router.param('username', function(req, res, next, username) {
    User.findOne({username: username}).then(function(user) {
        if (!user) { 
            return res.sendStatus(404);
        }
        
        // pre-populate .profile with the user object
        req.profile = user;
        return next();
    }).catch(next);
});

// GET profiles/:username
router.get('/:username', auth.optional, function(req, res, next) {
    if (req.payload) {
        User.findById(req.payload.id).then(function(user) {
            if (!user) {
                return res.json({profile: req.profile.toProfileJSONFor(false)});
            }

            return res.json({profile: req.profile.toProfileJSONFor(user)});
        });
    } else {
        return res.json({profile: req.profile.toProfileJSONFor(false)});
    }
});

// follow a user
router.post('/:username/follow', auth.required, function(req, res, next) {
    var profileId = req.profile._id;
    User.findById(req.payload.id).then(function(currentUser) {
        if (!currentUser) {
            // unauthenticated
            return res.sendStatus(401);
        }

        return currentUser.follow(profileId).then(function() {
            return res.json({ profile: req.profile.toProfileJSONFor(currentUser) });
        });
    }).catch(next);
});

// unfollow a user
router.delete('/:username/unfollow', auth.required, function(req, res, next) {
    var profileId = req.profile._id;
    User.findById(req.payload.id).then(function(currentUser) {
        if (!currentUser) {
            // unauthenticated
            return res.sendStatus(401);
        }

        currentUser.unfollow(profileId).then(function() {
            return res.json({ profile: req.profile.toProfileJSONFor(currentUser) });
        });
    }).catch(next);
});

module.exports = router;