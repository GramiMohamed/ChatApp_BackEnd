const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isConnected: { type: Boolean, default: false },
    socketId: { type: String, default: null },
    unreadMessages: {
        type: Map,
        of: Number,
        default: {}
    }
});

module.exports = mongoose.model('User', userSchema);
