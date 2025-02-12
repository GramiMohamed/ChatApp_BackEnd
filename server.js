require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const privateMessageRoutes = require('./routes/messagesPrivate');
const Message = require('./models/Message');
const PrivateMessage = require('./models/PrivateMessage');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:4200', // Frontend URL
        methods: ['GET', 'POST'],
    },
});

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        await User.updateMany({}, { isConnected: false, socketId: null });
        console.log('🔄 All users marked as disconnected on server startup');
    })
    .catch((err) => console.error('❌ Failed to connect to MongoDB', err));

app.use(cors());
app.use(express.json());

// Define routes
app.use('/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/privateMessages', privateMessageRoutes);

// Socket.io handling
io.on('connection', async (socket) => {
    console.log('🔗 User connected:', socket.id);

    socket.on('typing', (data) => {
        socket.broadcast.emit('typing', data);
    });

    socket.on('sendMessage', async (data) => {
        const { userId, username, content } = data;

        if (!userId || !username || !content) {
            return socket.emit('errorMessage', 'Invalid message data');
        }

        try {
            const message = new Message({
                user: userId,
                text: content,
                createdAt: new Date(),
            });

            await message.save();

            io.emit('receiveMessage', {
                _id: message._id,
                user: { id: userId, username },
                text: content,
                createdAt: message.createdAt,
            });

        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('errorMessage', 'Error saving message');
        }
    });

    socket.on('userConnected', async (userId) => {
        if (!mongoose.Types.ObjectId.isValid(userId)) return;

        try {
            const user = await User.findById(userId);
            if (user) {
                user.isConnected = true;
                user.socketId = socket.id;
                await user.save();

                const unreadMessages = user.unreadMessages || new Map();
                io.to(socket.id).emit('unreadMessages', unreadMessages);
                io.emit('updateUserList', await User.find({ isConnected: true }));
            }
        } catch (error) {
            console.error('❌ Error updating user connection status:', error);
        }
    });

    socket.on('userDisconnected', async (userId) => {
        try {
            const user = await User.findById(userId);
            if (user) {
                user.isConnected = false;
                user.socketId = null;
                await user.save();
                io.emit('updateUserList', await User.find({ isConnected: true }));
            }
        } catch (error) {
            console.error('❌ Error updating user disconnection status:', error);
        }
    });

    socket.on('sendPrivateMessage', async (data) => {
        const { senderId, receiverId, content } = data;

        if (!senderId || !receiverId || !content) {
            return socket.emit('errorMessage', 'Invalid data. Please provide senderId, receiverId, and content.');
        }

        if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
            return socket.emit('errorMessage', 'Invalid user ID');
        }

        try {
            const user = await User.findById(senderId);
            const receiver = await User.findById(receiverId);

            if (!user || !receiver) {
                return socket.emit('errorMessage', 'User not found');
            }

            const privateMessage = new PrivateMessage({
                sender: user._id,
                receiver: receiver._id,
                content: content.trim(),
            });

            await privateMessage.save();

            const currentUnreadCount = receiver.unreadMessages.get(senderId) || 0;
            receiver.unreadMessages.set(senderId, currentUnreadCount + 1);
            await receiver.save();

            if (receiver.socketId) {
                io.to(receiver.socketId).emit('receivePrivateMessage', {
                    sender: { id: user._id, username: user.username },
                    receiver: { id: receiver._id, username: receiver.username },
                    content: privateMessage.content,
                    createdAt: privateMessage.createdAt,
                });
            }

            socket.emit('receivePrivateMessage', {
                sender: { id: user._id, username: user.username },
                receiver: { id: receiver._id, username: receiver.username },
                content: privateMessage.content,
                createdAt: privateMessage.createdAt,
            });

        } catch (error) {
            console.error('Error sending private message:', error);
            socket.emit('errorMessage', 'Error sending private message');
        }
    });

    socket.on('markAsRead', async (senderId) => {
        try {
            const user = await User.findOne({ socketId: socket.id });
            if (user) {
                user.unreadMessages.set(senderId, 0);
                await user.save();
                io.to(user.socketId).emit('messageRead', { senderId });
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    });

    socket.on('disconnect', async () => {
        try {
            const user = await User.findOne({ socketId: socket.id });
            if (user) {
                user.isConnected = false;
                user.socketId = null;
                await user.save();
                io.emit('updateUserList', await User.find({ isConnected: true }));
            }
        } catch (error) {
            console.error('❌ Error updating user disconnection status:', error);
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`🚀 Server running on port ${port}`));
