import mongoose from 'mongoose';

const { Schema } = mongoose;

const PasteSchema = new Schema({
    title: String,
    id: String,
    author: { type: String, default: "Tuntematon lataaja" },
    ip: String,
    expiration: {
        type: Date,
    },
    allowedreads: { type: Number, default: 0 }, // 0 disables
    sha256: String,
    deletekey: String,
    content: String,
    programmingLanguage: String,
    date: { type: Date, default: Date.now },
    hidden: Boolean,
    meta: {
        votes: Number,
        favs: Number,
        views: Number,
        size: Number,
    },
    removed: { 
        isRemoved: {type: Boolean, default: false},
        reason: {type: String, default: ""}
    },
});

PasteSchema.index({
    title: 'text',
    content: 'text',
}, {
    name: 'Search index',
    weights: {
        title: 10,
        content: 6
    }
});

const UserSchema = new Schema({
    name: String,
    pwHash: String,
    pwSalt: String,
    email: String,
    activated: Boolean,
    activationKey: String,
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
    banned: { 
        status: {type: Boolean, default: false},
        reason: {type: String, default: ""}
    },
})

export { PasteSchema, UserSchema }
