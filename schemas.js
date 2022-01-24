const mongoose = require('mongoose');

const { Schema } = mongoose;

exports.PasteSchema = new Schema({
    title: String,
    id: String,
    author: String,
    ip: String,
    content: String,
    date: { type: Date, default: Date.now },
    hidden: Boolean,
    meta: {
        votes: Number,
        favs: Number,
        views: Number,
        size: Number,
    }
});

exports.UserSchema = new Schema({
    name: String,
    pwHash: String,
    ip: {
        last: String,
        all: [String]
    },
    registered: { type: Date, default: Date.now },
    roles: [String],
    meta: {
        pic: String,
        bio: String,
        followCount: Number,
    },
    followed: [String],
})

this.PasteSchema.index({
    title: 'text',
    content: 'text',
}, {
    name: 'Search index',
    weights: {
        title: 10,
        content: 6
    }
});