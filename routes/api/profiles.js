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
        // TODO id?
        User.findById(req.payload.id).then(function(user) {
            if (!user) {
                return res.json({profile: req.profile.toProfileJSON(false)});
            }

            return res.json({profile: req.profile.toProfileJSON(user)});
        });
    } else {
        return res.json({profile: req.profile.toProfileJSON(false)});
    }
    
});

module.exports = router;