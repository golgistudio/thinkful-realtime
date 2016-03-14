var socket_io = require('socket.io');
var http = require('http');
var express = require('express');

var app = express();
app.use(express.static('public'));

var server = http.Server(app);
var io = socket_io(server);

var userCount = 0
var userList = []

io.on('connection', function (socket) {

    var nameAdded = false

    // Register a new user and let everyone know who has joined
    socket.on('new user', function (name) {
        if (nameAdded) return;

        socket.username = name;
        ++userCount;
        nameAdded = true;

        // Save this user along with their socket connection
        userList[name] = socket

        var dateJoined = new Date(Date.now());

        var broadcastMessage = {
            name: socket.username,
            userCount: userCount,
            date: dateJoined.toString()
        }

        // Send to the user and everyone else a notice who joined.
        socket.emit('user joined', broadcastMessage);
        socket.broadcast.emit('user joined', broadcastMessage);

        var userNamesList = []

        for (var i in userList) {
            userNamesList.push(i)
        }

        var userListMessage = {
            namesList: userNamesList,
            userCount: userCount
        }

        // Broadcast the list of all user's online
        socket.emit('user list', userListMessage);
        socket.broadcast.emit('user list', userListMessage);

    });

    // Send the message to the sender and everyone else.
    socket.on('message', function(messagePacket) {

        if (nameAdded) {
            var dateJoined = new Date(Date.now());
            var broadcastMessage = {
                sender: socket.username,
                contents: messagePacket.contents,
                date: dateJoined.toString()
            }

            socket.emit('message', broadcastMessage);
            socket.broadcast.emit('message', broadcastMessage);
        }
    });

    // Handle typing message
    socket.on('typing message', function(messagePacket) {

        if (nameAdded) {
            var broadcastMessage = {
                sender: socket.username
            }

            socket.broadcast.emit('typing message', broadcastMessage);
        }
    });

    // Handle stopped typing message
    socket.on('stopped typing', function(messagePacket) {

        if (nameAdded) {
            var broadcastMessage = {
                sender: socket.username
            }

            socket.broadcast.emit('stopped typing', broadcastMessage);
        }
    });

    // Handle private message
    socket.on('private message', function(messagePacket) {
        if (nameAdded) {
            var dateJoined = new Date(Date.now());
            var privateMessage = {
                sender: socket.username,
                contents: messagePacket.contents,
                date: dateJoined.toString(),
                recipient: messagePacket.recipient
            }

            // Respond to the sender
            socket.emit('private-message', privateMessage);

            // Get the receiver of the message and send it
            var toSocket = userList[messagePacket.recipient]

            if (toSocket) {
                toSocket.emit('private-message', privateMessage)
            }
        }
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        if (nameAdded && userCount) {
            --userCount;
            nameAdded = false;

            var dateJoined = new Date(Date.now());

            // echo globally that this client has left
            var disconnectMessage = {
                name: socket.username,
                userCount: userCount,
                date: dateJoined.toString()
            }
            socket.broadcast.emit('user left', disconnectMessage);

            for (var index in userList) {

                if (index === socket.username) {
                    delete userList[index]
                }
            }

            var userNamesList = []

            for (var i in userList) {
                userNamesList.push(i)
            }
            var userListMessage = {
                namesList: userNamesList,
                userCount: userCount
            }

            socket.broadcast.emit('user list', userListMessage);
        }
    });
});

var port = 8080
server.listen(port);
console.log('listening on port: ' + port)