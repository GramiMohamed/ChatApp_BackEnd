const express = require('express');
const PrivateMessage = require('../models/PrivateMessage');
const User = require('../models/User');
const router = express.Router();

// Send a private message
router.post('/', async (req, res) => {
  try {
    const { sender, receiver, content } = req.body;

    // Validate that required fields are present
    if (!sender || !receiver || !content) {
      return res.status(400).json({ error: 'Sender, receiver, and content are required' });
    }

    // Validate sender and receiver existence
    const senderUser = await User.findById(sender.id);
    const receiverUser = await User.findById(receiver.id);

    if (!senderUser) {
      return res.status(404).json({ error: 'Sender not found' });
    }
    if (!receiverUser) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Create and save the private message
    const privateMessage = new PrivateMessage({
      sender: sender.id,
      receiver: receiver.id,
      content,
    });

    await privateMessage.save();

    // Return the saved message with the sender and receiver usernames
    res.status(201).json({
      message: 'Private message sent successfully',
      privateMessage: {
        ...privateMessage.toObject(),
        sender: senderUser.username,
        receiver: receiverUser.username,
        createdAt: privateMessage.createdAt,
      }
    });
  } catch (error) {
    console.error('Error sending private message:', error);
    res.status(500).json({ error: 'Error sending private message' });
  }
});

// Fetch private messages between two users
router.get('/private/:senderId/:receiverId', async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    // Fetch messages
    const messages = await PrivateMessage.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    }).populate('sender', 'username email avatar')  // Populate more fields if needed
      .populate('receiver', 'username email avatar')
      .sort({ createdAt: 1 });  // Sorting messages by creation time

    // Return messages
    res.json({
      messages,
      count: messages.length,
    });
  } catch (error) {
    console.error('Error fetching private messages:', error);
    res.status(500).json({ error: 'Error fetching private messages' });
  }
});

module.exports = router;
