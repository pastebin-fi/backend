import mongoose from "mongoose"

const { Schema } = mongoose

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
    lang: String, // language is reserved for real languages
    date: { type: Date, default: Date.now },
    hidden: Boolean,
    meta: {
        votes: Number,
        favs: Number,
        views: { type: Number, default: 0 },
        size: Number,
    },
    removed: {
        isRemoved: { type: Boolean, default: false },
        reason: { type: String, default: "" },
    },
})

PasteSchema.index(
    {
        title: "text",
        content: "text",
    },
    {
        name: "Search index",
        weights: {
            title: 10,
            content: 6,
        },
    }
)

const UserSchema = new Schema({
    name: String,
    password: String,
    email: String,
    activated: Boolean,
    ip: {
        last: String,
        all: [String],
    },
    registered: { type: Date, default: () => Date.now() },
    roles: [String],
    meta: {
        pic: String,
        bio: String,
        followCount: Number,
    },
    activations: [
        {
            id: String,
            createdAt: {
                type: Date,
                default: () => Date.now(),
            },
        },
    ],
    lastSentActivation: {
        type: Date,
        default: () => Date.now(),
    },
    followed: [String],
    favorites: [String],
    banned: {
        status: { type: Boolean, default: false },
        reason: { type: String, default: "" },
    },
    sessions: [
        {
            token: String,
            ip: String,
            lastLogin: {
                type: Date,
                default: () => Date.now(),
            },
            initializedAt: {
                type: Date,
                default: () => Date.now(),
            },
        },
    ],
})

export { PasteSchema, UserSchema }
