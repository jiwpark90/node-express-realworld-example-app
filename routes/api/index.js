// place to register all the API routes

var router = require('express').Router();

// register the users route
// uses '/' because the details of '/user(s)' is defined
// in users.js
router.use('/', require('./users'));
router.use('/profiles', require('./profiles'));
router.use('/articles', require('./articles'));
router.use('/tags', require('./tags'));

// Note: You need to define have this 'use' after all the other 'uses' above.
// routes with 4 arguments means it will be an error handler.
// sits after all of our API routes and is used for catching
// 'ValidationError's thrown mongoose.
router.use(function(err, req, res, next) {
    console.log("in error: ", err);

    // Q: this is just a string value I'm supposed to know?
    // A: Yup
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