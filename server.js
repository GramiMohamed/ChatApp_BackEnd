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
        origin: 'http://localhost:4200',  // Assurez-vous que c'est l'adresse correcte de votre frontend Angular
        methods: ['GET', 'POST']
    }
});

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB', err);
    });

app.use(express.json());
app.use(cors());

// Routes
app.use('/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/privateMessages', privateMessageRoutes);

// Gestion de la connexion Socket.io
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
  
    socket.on('sendMessage', async (data) => {
        console.log('Received message data:', data);
        
        try {
            const user = await User.findById(data.userId);
            if (!user) {
                console.error('User not found:', data.userId);
                return socket.emit('errorMessage', 'User not found');
            }
        
            const messageData = { user: user._id, text: data.text };
            if (data.receiverId) {
                const receiver = await User.findById(data.receiverId);
                if (!receiver) {
                    console.error('Receiver not found:', data.receiverId);
                    return socket.emit('errorMessage', 'Receiver not found');
                }
                messageData.receiver = receiver._id;

                // Sauvegarder dans PrivateMessage
                const privateMessage = new PrivateMessage({
                    sender: user._id,
                    receiver: receiver._id,
                    content: data.text
                });
                console.log('Saving private message:', privateMessage);
                await privateMessage.save();
                console.log('Private message saved:', privateMessage);
            }
        
            const message = new Message(messageData);
            console.log('Saving message:', message);
            await message.save();
            console.log('Message saved:', message);
        
            if (data.receiverId) {
                io.to(data.receiverId).emit('receivePrivateMessage', {
                    sender: { id: user._id, username: user.username },
                    receiver: { id: receiver._id, username: receiver.username },
                    text: privateMessage.content,
                    createdAt: privateMessage.createdAt
                });
            } else {
                io.emit('receiveMessage', {
                    user: { id: user._id, username: user.username },
                    text: message.text,
                    createdAt: message.createdAt
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('errorMessage', 'Error sending message');
        }
    });
  
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Middleware pour gérer les erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});