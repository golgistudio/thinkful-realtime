$(document).ready(function() {
    var socket = io();
    var input = $('input');
    var messages = $('#messages');
    var namesID = $('#usernames');
    var userList = $('#userList');
    var chatHeader = $('#chatHeader')

    // Get a random user name and register it
    $.ajax({
        url: 'https://randomuser.me/api/',
        dataType: 'json',
        success: function(data){
            var myName = data.results[0].user.name.first
            myName = myName.trim()
            socket.emit('new user',  myName);
            chatHeader.empty()
            chatHeader.append('Share your thoughts ' + myName)
        }
    });

    var listNames = function(data) {

        var namesList = data.namesList;
        var userCount = data.userCount;

        namesID.empty()
        userList.empty()

        for (var index in namesList) {
            namesID.append('<li>' + namesList[index] + '</li>');
        }

        userList.append('Users Online (' + userCount + ')')

    }

    var addMessage = function(messagePacket) {
        var messageString = '<div><span class="name">' + messagePacket.sender +  ' - </span> <span class="date">' + messagePacket.date + '</span></div>'
        messageString += '<div class="message">' + messagePacket.contents + '</div>'
        messages.prepend(messageString);
    };

    var userJoined = function (message) {
        var messageString = '<div><span class="name">' + message.name +  ' - </span> <span class="date">' + message.date + '</span></div>'
        messageString += '<div class="message">' + message.name + ' joined the discussion</div>'
        messageString += '<div class="message">' + message.userCount + ' users in chat</div>'
        messages.prepend(messageString);

    }

    var userLeft = function (message) {
        var messageString = '<div><span class="name">' + message.name +  ' - </span> <span class="date">' + message.date + '</span></div>'
        messageString += '<div class="message">' + message.name + ' left the discussion</div>'
        messageString += '<div class="message">' + message.userCount + ' users remaining in chat room</div>'
        messages.prepend(messageString);
    }

    input.on('keydown', function(event) {
        if (event.keyCode != 13) {
            return;
        }

        var message = $("#message-input").val();
        var messagePacket = {
            contents: message,
            date: new Date(Date.now())
        }

        if (message[0] === '~') {

            var recipientName = message.split(' ')
            var toName = recipientName[0].slice(1)
            console.log('private message to :' + toName)
            messagePacket['recipient'] = toName
            socket.emit('private message', messagePacket);
        } else {
            socket.emit('message', messagePacket);
        }
        input.val('');
    });

    socket.on('message', addMessage);
    socket.on('user joined', userJoined);
    socket.on('user left', userLeft);
    socket.on('user list', listNames);
});