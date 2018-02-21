var jwt = require('express-jwt');
var secret = require('../config').secret;

function getTokenFromHeader(req) {
    if (req.headers.authorization &&
        req.headers.authorization.split(' ')[0] === 'Token') {

        return req.headers.authorization.split(' ')[1];
    }
    return null;
}

// route 'middleware' to handle decoding JWT's
// TODO JWT payload will be attached to 'payload'
var auth = {
    required: jwt({
        secret: secret,
        userProperty: 'payload',
        getToken: getTokenFromHeader
    }),
    optional: jwt({
        secret: secret,
        userProperty: 'payload',
        credentialsRequired: false,
        getToken: getTokenFromHeader
    })
};

module.exports = auth;