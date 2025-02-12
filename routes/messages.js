const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const router = express.Router();

// Récupérer tous les messages
router.get('/', async (req, res) => {
    try {
        const messages = await Message.find().populate('user', 'username');
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

// Récupérer les messages d'un utilisateur spécifique
router.get('/:userId', async (req, res) => {
    try {
        const messages = await Message.find({ user: req.params.userId }).populate('user', 'username');
        res.json(messages);
    } catch (error) {
        console.error('Error fetching user messages:', error);
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

// Envoyer un message (enregistrement en base)
router.post('/', async (req, res) => {
    const { userId, text, receiverId } = req.body;

    if (!userId || !text) {
        return res.status(400).json({ error: 'User ID and message text are required' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const messageData = { user: userId, text };
        if (receiverId) {
            const receiver = await User.findById(receiverId);
            if (!receiver) {
                return res.status(404).json({ error: 'Receiver not found' });
            }
            messageData.receiver = receiverId;
        }

        const message = new Message(messageData);
        await message.save();

        res.status(201).json({ 
            message: 'Message sent successfully', 
            data: { 
                _id: message._id, 
                user: { _id: user._id, username: user.username }, 
                receiver: message.receiver || null,
                text: message.text, 
                createdAt: message.createdAt 
            }
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Error sending message' });
    }
});

module.exports = router;
