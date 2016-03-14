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

    socket.on('new user', function (name) {
        if (nameAdded) return;

        socket.username = name;
        ++userCount;
        nameAdded = true;
        userList[name] = socket

        var broadcastMessage = {
            name: socket.username,
            userCount: userCount,
            date: new Date(Date.now())
        }
        socket.emit('user joined', broadcastMessage);
        socket.broadcast.emit('user joined', broadcastMessage);

        console.log(socket.username + ' joined the discussion');

        var userNamesList = []

        for (var i in userList) {
            userNamesList.push(i)
        }

        var userListMessage = {
            namesList: userNamesList,
            userCount: userCount
        }

        socket.emit('user list', userListMessage);
        socket.broadcast.emit('user list', userListMessage);

        console.log('user list: ' +  userListMessage)

    });

    socket.on('message', function(messagePacket) {
        console.log(messagePacket)
        console.log(nameAdded)
        if (nameAdded) {
            var broadcastMessage = {
                sender: socket.username,
                contents: messagePacket.contents,
                date: messagePacket.date
            }
            console.log('Received message:', broadcastMessage);

            socket.emit('message', broadcastMessage);
            socket.broadcast.emit('message', broadcastMessage);
        }
    });

    socket.on('private message', function(messagePacket) {
        if (nameAdded) {
            var broadcastMessage = {
                sender: socket.username,
                contents: messagePacket.contents + ' sent to "' + messagePacket.recipient + '"',
                date: messagePacket.date
            }
            console.log('Received private message:', broadcastMessage);

            socket.emit('message', broadcastMessage);

            var privateMessage = {
                sender: socket.username,
                contents: 'private message: ' + messagePacket.contents,
                date: messagePacket.date
            }
            var toSocket = userList[messagePacket.recipient]

            for (var i in userList) {
                console.log('"' + i  + '"')
                if (i === messagePacket.recipient) {
                    console.log("it is there")
                }
            }

            if (toSocket) {
                console.log("Found")
                toSocket.emit('message', privateMessage)
            }
        }
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        if (nameAdded && userCount) {
            --userCount;
            nameAdded = false;

            // echo globally that this client has left
            var disconnectMessage = {
                name: socket.username,
                userCount: userCount,
                date: new Date(Date.now())
            }
            socket.broadcast.emit('user left', disconnectMessage);

            for (var index in userList) {

                if (index === socket.username) {
                    console.log('left - ' + index)
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

            console.log('user list: ' +  userListMessage)
        }
    });
});

var port = 8080
server.listen(port);
console.log('listening on port: ' + port)