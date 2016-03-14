$(document).ready(function() {
    var socket = io();
    var input = $('input');
    var messages = $('#messages');
    var privateMessages = $('#private-messages');
    var namesID = $('#usernames');
    var userList = $('#userList');
    var chatHeader = $('#chatHeader');
    var onlineUsers = $('#online-users');
    var notifications = $('#notifications');

    var myName;
    var targetSender = 'Everyone';
    var isTyping = false;
    var timeout = undefined;

    function updateNickName(data) {
        myName = data.results[0].user.name.first
        myName = myName.trim()
        socket.emit('new user',  myName);
        chatHeader.empty()
        chatHeader.append('Welcome ' + myName + '! Share your thoughts ')
    }

    // Get a random user name and register it
    $.ajax({
        url: 'https://randomuser.me/api/',
        dataType: 'json',
        success: updateNickName
    });

    // Get the dropdown selection for the private message
    $( document.body ).on( 'click', '.dropdown-menu li', function( event ) {

        var $target = $( event.currentTarget );
        targetSender = $target.text().trim();

        $target.closest( '.input-group-btn' )
            .find( '[data-bind="dropdown"]' ).text( $target.text() )
            .end()
            .children( '.dropdown-toggle' ).dropdown( 'toggle' );

        return false;
    });

    // Send stopped typing message
    function stoppedTypingNotification() {
        isTyping = false;
        socket.emit("stopped typing", myName);
    }

    // send typing notification
    function isTypingNotification() {
        isTyping = true;
        socket.emit('typing message', myName);
    }

    //
    input.on('keydown', function(event) {

        // If it is not the enter key, send typing notification
        if (event.keyCode != 13) {

            // If already typing, just set the notification
            if (!isTyping) {
                isTypingNotification();
            } else {
                clearTimeout(timeout);
                timeout = setTimeout(stoppedTypingNotification, 3000);
            }
            return;
        }

        // Send clear typing notification
        clearTimeout(timeout);
        stoppedTypingNotification();


        var message = $("#message-input").val();

        if (message.trim().length > 0) {
            var messagePacket = {
                contents: message
            }

            if (targetSender === 'Everyone') {
                socket.emit('message', messagePacket);
            } else {
                messagePacket['recipient'] = targetSender
                socket.emit('private message', messagePacket);
            }
            input.val('');
        }
    });

    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // get localized date in json format from a date string
    function getJSONDate(dateString) {
        var newDate = new Date(dateString);
        var dayString = days[newDate.getDay()]
        var dateString = newDate.toLocaleDateString()
        var timeString = newDate.toLocaleTimeString()
        return {
            day: dayString,
            dateString: dateString,
            timeString: timeString
        }
    }


    // Update dropdown for private message selection
    var addToDropdown = function(data) {

        var namesList = data.namesList;

        // Clear the current list
        onlineUsers.empty();

        // Add default everyone option
        onlineUsers.append('<li><a href="#"> Everyone </a></li>')
        onlineUsers.append('<li role="separator" class="divider"></li>')

        // Add the names
        for (var index in namesList) {
            if (namesList[index] !== myName)
                onlineUsers.append('<li><a href="#">' + namesList[index] + '</a></li>')
        }
    }

    // Show current users on the side bar
    function showCurrentUsers(data) {
        var namesList = data.namesList;
        var userCount = data.userCount;

        // Empty the current list and title
        namesID.empty()
        userList.empty()

        // Add the current users
        for (var index in namesList) {
            namesID.append('<li>' + namesList[index] + '</li>');
        }

        // Update the title with the current user count
        userList.append('Users Online (' + userCount + ')');
    }

    // Socket event handlers
    var listNames = function(data) {
        showCurrentUsers(data)
        addToDropdown(data);
    }

    var addMessage = function(message) {
        var localizedDate = getJSONDate(message.date)

        var messageString = '<div><span class="name">' + message.sender +  ' </span> <span class="date">'
        messageString += localizedDate.day + ' ' + localizedDate.dateString + ' ' + localizedDate.timeString
        messageString += '</span></div>'
        messageString += '<div class="message">' + message.contents + '</div>'
        messages.prepend(messageString);
    };

    var addPrivateMessage = function(message) {
        var localizedDate = getJSONDate(message.date)

        var messageString = '<div><span class="name">' + message.sender + ' to ' + message.recipient + ' - '
        messageString += ' </span> <span class="date">'
        messageString += localizedDate.day + ' ' + localizedDate.dateString + ' ' + localizedDate.timeString
        messageString += '</span></div>'
        messageString += '<div class="message">' + message.contents + '</div>'
        privateMessages.prepend(messageString);
    };

    var userJoined = function (message) {
        var localizedDate = getJSONDate(message.date)

        var messageString = '<div><span class="name">' + message.name +  ' </span> <span class="date">'
        messageString += localizedDate.day + ' ' + localizedDate.dateString + ' ' + localizedDate.timeString
        messageString += '</span></div>'
        messageString += '<div class="message">' + message.name + ' joined the discussion</div>'
        messageString += '<div class="message">' + message.userCount + ' users in chat</div>'
        messages.prepend(messageString);

    }

    var userLeft = function (message) {
        var localizedDate = getJSONDate(message.date)

        var messageString = '<div><span class="name">' + message.name +  ' </span> <span class="date">'
        messageString += localizedDate.day + ' ' + localizedDate.dateString + ' ' + localizedDate.timeString
        messageString += '</span></div>'

        messageString += '<div class="message">' + message.name + ' left the discussion</div>'
        messageString += '<div class="message">' + message.userCount + ' users remaining in chat room</div>'
        messages.prepend(messageString);
    }

    var typingMessage = function (message) {
        var messageString = '<div><span class="update">' + message.sender +  ' is typing a message.... </span></div>'
        notifications.append(messageString);
    }

    var clearTypingMessage = function (message) {
        notifications.empty();
    }

    // Register for socket messages
    socket.on('private-message', addPrivateMessage);
    socket.on('message', addMessage);
    socket.on('user joined', userJoined);
    socket.on('user left', userLeft);
    socket.on('user list', listNames);
    socket.on('typing message', typingMessage);
    socket.on('stopped typing', clearTypingMessage);
});