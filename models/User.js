var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var secret = require('../config').secret;

// 1. define schema
var UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        lowercase: true,
        required: [
            true,
            "can't be blank"
        ],
        match: [/^[a-zA-Z0-9]+$/, "is invalid"],
        index: true
    },
    email: {
        type: String, 
        unique: true,
        lowercase: true, 
        required: [
            true, 
            "can't be blank"
        ], 
        match: [/\S+@\S+\.\S+/, 'is invalid'], 
        index: true
    },
    bio: String,
    image: String,
    hash: String,
    salt: String
}, 
// creates 'createdAt' & 'updatedAt' fields
{timestamps: true});

// 1a. define additional features for the schema
UserSchema.plugin(uniqueValidator, {message: "is already taken."});

UserSchema.methods.setPassword = function(password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    // password, salt, # timesdto hash the password, length of the hash, and the algo
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
}

UserSchema.methods.validatePassword = function(password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash == hash;
}

// generates the payload (assertions) that is signed
// by the backend
UserSchema.methods.generateJWT = function() {
    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    return jwt.sign({
        id: this._id,
        username: this.username,
        exp: parseInt(exp.getTime() / 1000)
    }, secret);
}

// gets the JSON representation of the user that will be 
// passed to the frontend during auth.
// should only be returned to that specific user since it
// contains things like the JWT
// (gets used after creating the user)
UserSchema.methods.toAuthJSON = function() {
    return {
        username: this.username,
        email: this.email,
        token: this.generateJWT(),
        bio: this.bio,
        image: this.image
    };
}

// gets the JSON representation of the user's public view
UserSchema.methods.toProfileJSON = function() {
    return {
        username: this.username,
        bio: this.bio || "",
        image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
        following: false
    };
}

// 2. register model
mongoose.model('User', UserSchema);