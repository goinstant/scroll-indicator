/*global $, window, goinstant, getOrSetRoomCookie, jQuery */
'use strict';
var console=console||{"error":function(){}};

function connect(options) {
  var connectUrl = 'https://goinstant.net/goinstant-services/docs';
  var connection = new goinstant.Connection(connectUrl, options);

  connection.connect(function(err, connection) {
    if (err) {
      return console.error('could not connect:', err);
    }

    var roomName = getOrSetRoomCookie("scrolling");
    var currentRoom = connection.room(roomName);

    currentRoom.join(function(err) {
      if (err) {
        return console.error('Error joining room:', err);
      }

      var color = options.guestId == "1" ? "#f00" : "#0f0";
      var userKey = currentRoom.self();

      userKey.key('displayName').set('Guest ' + options.guestId, function(err) {
        if (err) {
          return console.error("Error setting userId", err);
        }
      });
      userKey.key('avatarColor').set(color, function(err) {
        if (err) {
          return console.error("Error setting avatarColor", err);
        }
        // The user now appears red in the user-list, etc.
      });

      var ScrollIndicator = goinstant.widgets.ScrollIndicator;
      var scrollIndicator = new ScrollIndicator({ room: currentRoom });
      scrollIndicator.initialize(function(err) {
        if (err) {
          return console.error("Error initializing scroll-indicator:", err);
        }
      });
    });
  });
}

$(window).ready(function() {
  // window.options comes from an inline script tag in each iframe.
  connect(window.options);
});
