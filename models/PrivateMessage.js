const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const privateMessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const PrivateMessage = mongoose.model('PrivateMessage', privateMessageSchema);
module.exports = PrivateMessage;