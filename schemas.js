const mongoose = require('mongoose');

const { Schema } = mongoose;

exports.PasteSchema = new Schema({
    title: String,
    id: String,
    author: String,
    ip: String,
    keywords: [
        String
    ],
    expiration: {
        type: Date,
    },
    allowedreads: { type: Number, default: 0 }, // 0 disables
    sha256: String,
    deletekey: String,
    content: String,
    language: String,
    date: { type: Date, default: Date.now },
    hidden: Boolean,
    meta: {
        votes: Number,
        favs: Number,
        views: Number,
        size: Number,
    },
    removed: { 
        status: {type: Boolean, default: false},
        reason: {type: String, default: ""}
    },
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
    favorites: [String],
    roles: [String],
    banned: { 
        status: {type: Boolean, default: false},
        reason: {type: String, default: ""}
    },
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