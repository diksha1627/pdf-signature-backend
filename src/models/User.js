// User.js placeholder
const mongoose = require('mongoose');
const { Schema } = mongoose;


const userSchema = new Schema({
email: { type: String, required: true, unique: true },
passwordHash: { type: String, required: true },
name: { type: String },
role: { type: String, enum: ['UPLOADER', 'SIGNER'], default: 'SIGNER' },
refreshTokenHash: { type: String },
createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('User', userSchema);