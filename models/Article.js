var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var slug = require('slug');

var ArticleSchema = new mongoose.Schema({
    slug: {
        type: String,
        lowercase: true,
        unique: true
    },
    title: String,
    description: String,
    body: String,
    favoritesCount: {
        type: Number,
        default: 0
    },
    tagList: [{ type: String }],
    author: {
        // basically FK 'constraint'
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps : true });

ArticleSchema.plugin(uniqueValidator, { message: 'is already taken' });

ArticleSchema.methods.slugify = function() {
    this.slug = slug(this.title) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36);
}

// TODO is the 'validate' a special string that puts this hook
// before a particular step?
ArticleSchema.pre('validate', function(next) {
    if (!this.slug) {
        this.slugify();
    }

    next();
});

// note that it receives user
ArticleSchema.methods.toJSON = function(user) {
    console.log("IN TO JSON with USER: ", user);
    return {
        slug: this.slug,
        title: this.title,
        description: this.description,
        body: this.body,
        tagList: this.tagList,
        favoritesCount: this.favoritesCount,
        // mongoose understands that author is of schema 'User'
        // because it defined it as 'ref' in the schema
        author: this.author.toProfileJSON(user),

        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
}

mongoose.model('Article', ArticleSchema);