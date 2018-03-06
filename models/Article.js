var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var slug = require('slug');
var User = mongoose.model('User');

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
    },
    comments: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Comment'
    }]
}, { timestamps : true });

ArticleSchema.plugin(uniqueValidator, { message: 'is already taken' });

ArticleSchema.methods.slugify = function() {
    this.slug = slug(this.title) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36);
}

ArticleSchema.methods.updateFavoriteCount = function() {
    var article = this;
    return User.count({ favorites: {$in: [article._id]} }).then(function(count) {
        article.favoritesCount = count;
        return article.save();
    });
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
ArticleSchema.methods.toJSONFor = function(currentUser) {
    return {
        slug: this.slug,
        title: this.title,
        description: this.description,
        body: this.body,
        tagList: this.tagList,
        favorited: currentUser ? currentUser.isFavorite(this._id) : false,
        favoritesCount: this.favoritesCount,
        // mongoose understands that author is of schema 'User'
        // because it defined it as 'ref' in the schema
        author: this.author.toProfileJSONFor(currentUser),

        createdAt: this.createdAt,
        updatedAt: this.updatedAt
        // TODO comments will come here, right? probably something like:
        // comments: ....... foreach? wtf
    };
}

mongoose.model('Article', ArticleSchema);