const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessages, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const publicDirectoyPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoyPath));

io.on('connection', (socket) => {
    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter();
        if (filter.isProfane(message)) {
            callback('Profanity is now allowed!');
        } else {
            const user = getUser(socket.id);
            io.to(user.room).emit('message', generateMessages(user.username, message));
            callback('Delivered');
        }
    }
    );

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMessages('Admin', `${user.username} has left!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
        callback();
    });

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        if (user) {
            socket.join(user.room);
            socket.emit('message', generateMessages('Admin', 'Welcome!'));
            socket.broadcast.to(user.room).emit('message', generateMessages('Admin', `${user.username} has joined!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        } else {
            callback(error);
        }
    });

});

const port = process.env.PORT || 3000;
server.listen(port);