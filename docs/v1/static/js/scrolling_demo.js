/*global $, window, goinstant, console, jQuery */
'use strict';

function connect(options) {
  var connectUrl = 'https://goinstant.net/goinstant-services/docs';
  var connection = new goinstant.Connection(connectUrl, options);

  connection.connect(function(err, connection) {
    if (err) {
      console.error('could not connect:', err);
      return;
    }

    var roomName = getOrSetRoomCookie("scrolling");
    var currentRoom = connection.room(roomName);

    currentRoom.join(function(err) {
      if (err) {
        console.error('Error joining room:', err);
        return;
      }

      currentRoom.user(function(err, user, userKey) {
        userKey.key('displayName').set('Guest ' + options.guestId, function(err) {
          if (err) {
            console.log("Error setting userId", err);
            return;
          }
        });
        var color = options.guestId == "1" ? "#f00" : "#0f0";
        userKey.key('avatarColor').set(color, function(err) {
          if (err) {
            return console.error(err);
          }
          // The user now appears red in the user-list, etc.
        });
      });

      var ScrollIndicator = goinstant.widgets.ScrollIndicator;
      var scrollIndicator = new ScrollIndicator({ room: currentRoom });
      scrollIndicator.initialize(function(err) {
        if (err) {
          console.log("Error initializing scroll-indicator:", err);
          return;
        }
      });
    });
  });
}

$(window).ready(function() {
  // window.options comes from an inline script tag in each iframe.
  connect(window.options);
});
