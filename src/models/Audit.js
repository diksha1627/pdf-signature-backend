// Audit.js placeholder
const mongoose = require('mongoose');
const { Schema } = mongoose;


const auditSchema = new Schema({
userId: { type: Schema.Types.ObjectId, ref: 'User' },
action: String,
meta: Schema.Types.Mixed,
createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Audit', auditSchema);