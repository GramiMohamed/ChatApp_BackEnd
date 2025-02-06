const express = require('express');
const PrivateMessage = require('../models/PrivateMessage');
const User = require('../models/User');
const router = express.Router();

// Envoyer un message privé
router.post('/private', async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;

    // Vérifier si les deux utilisateurs existent
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ message: 'Sender or receiver not found' });
    }

    // Créer un nouveau message privé
    const message = new PrivateMessage({
      sender: senderId,
      receiver: receiverId,
      content
    });

    // Sauvegarder le message
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Error sending private message', error: err });
  }
});

// Récupérer les messages privés entre deux utilisateurs
router.get('/private/:userId/:friendId', async (req, res) => {
  try {
    const { userId, friendId } = req.params;

    // Vérifier si les deux utilisateurs existent
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) {
      return res.status(404).json({ message: 'User or friend not found' });
    }

    // Récupérer les messages privés entre les deux utilisateurs
    const messages = await PrivateMessage.find({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    }).populate('sender', 'username').populate('receiver', 'username');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving private messages', error: err });
  }
});

module.exports = router;