var mongoose = require('mongoose');
var User = mongoose.model('User');
var router = require('express').Router();
var passport = require('passport');
var auth = require('../auth');

// GET user
router.get('/user', auth.required, function(req, res, next) {
    console.log("in get user: ", req);
    // TODO 'payload' all the sudden? is that the format for 'get' requests?
    User.findById(req.payload.id).then(function(user) {
        // if promise was resolved, but user is falsey, means
        // JWT payload was invalid (express automatically checks it against
        // the token defined in the header of the request). THIS ONLY HAPPENS if you try
        // to use JWT of a user that's deleted from DB, but this is an edge
        // case since we won't be deleteing from DB in this project.
        if (!user) {
            // TODO 'sendStatus', not 'status(401)...'? another get thing
            return res.sendStatus(401);
        }

        return res.json({user: user.toAuthJSON()});
    }).catch(next);
});

// UPDATE user
router.put('/user', auth.required, function(req, res, next) {
    User.findById(req.payload.id).then(function(user) {
        if (!user) {
            return res.sendStatus(401);
        }

        // only update fields that were actually passed
        setPropertyIfDefined("username", req.body.user, user);
        setPropertyIfDefined("email", req.body.user, user);
        setPropertyIfDefined("bio", req.body.user, user);
        setPropertyIfDefined("image", req.body.user, user);
        if (typeof req.body.user.passport !== 'undefined') {
            user.setPassword(req.body.user.passport);
        }

        return user.save().then(function() {
            return res.json({user: user.toAuthJSON()});
        }).catch(next);
    });
});

function setPropertyIfDefined(propName, input, obj) {
    if (typeof input[propName] !== 'undefined') {
        obj[propName] = input[propName];
    }
}

// CREATE user
router.post('/users', function(req, res, next) {
    console.log("in create user: ", req);
    var user = new User();

    user.username = req.body.user.username;
    user.email = req.body.user.email;
    user.setPassword(req.body.user.password);

    // if save is successful, then return the user representation
    // that is reserved for specific users (contains JWT token)
    user.save().then(function() {
        return res.json({ user : user.toAuthJSON()});
    }).catch(next); // TODO find out what next is - error handler?
});

// LOGIN
router.post('/users/login', function(req, res, next) {
    console.log("in login: ", req);
    if (!req.body.user.email) {
        return res.status(422).json({errors: {email: "can't be blank"}});
    }
    if (!req.body.user.password) {
        return res.status(422).json({errors: {password: "can't be blank"}});
    }

    passport.authenticate('local', { session: false }, function(err, user, info) {
        // this is a caught error, not the login error
        if (err) {
            // TODO where does this next go?
            return next(err);
        }

        // after you verify the password, pass back the token
        if (user) {
            // TODO WHY is it calling generateJWT() if toAuthJSON() already
            // calls it inside?
            user.token = user.generateJWT();
            return res.json({user: user.toAuthJSON()});
        } else {
            // this should be the login error
            return res.status(422).json(info);
        }
    })(req, res, next);
});

// routes with 4 arguments means it will be an error handler.
// sits after all of our API routes and is used for catching
// 'ValidationError's thrown mongoose.
router.use(function(err, req, res, next) {
    console.log("in error: ", err);

    // TODO this is just a string value I'm supposed to know?
    if (err.name == 'ValidationError') {
        // 422 - unprocessable entity, which means that re recognize it,
        // it's in the right format, but it's just wrong.
        return res.status(422).json({
            // fancy way of building up of key -> error message dictionary
            errors: Object.keys(err.errors).reduce(function(errors, key) {
                errors[key] = err.errors[key].message;

                return errors;
            }, {})
        });
    }

    return next(err);
});

module.exports = router;