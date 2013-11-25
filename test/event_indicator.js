/*jshint browser:true */
/* global require */

/**
 * @fileOverview
 * Contains unit tests for the EventIndicator class.
 */

var Emitter = require('emitter');

describe('EventIndicator', function() {

  'use strict';

  var EventIndicator = require('scroll-indicator/lib/event_indicator.js');
  var assert = window.assert;
  var sinon = window.sinon;

  var eventIndicator = null;
  var fakeScrollIndicator = null;
  var fakeChannel = null;
  var fakeRoom = {};
  var fakeScrollTracker = null;

  var CHANNEL_NAMESPACE = 'goinstant-widgets-scroll-indicator';

  beforeEach(function() {

    var userCache = {
      map: {
          id_abc: {id: 'abc'},
          id_def: {id: 'def'}
      },
      getUser: function(id) {
        return this.map[id];
      },
      getLocalUser: function() {
        return this.map.id_abc;
      }
    };

    var fakeEmitter = new Emitter();

    var fakeView = {
      addEventIndicator: sinon.stub()
    };

    var fakeOptions = {
      eventUI: true
    };

    fakeScrollIndicator = {
      _emitter: fakeEmitter,
      _view: fakeView,
      _userCache: userCache,
      _id: 'test',
      _options: fakeOptions
    };

    fakeChannel = new Emitter();

    fakeChannel.message = function(message) {
      this.emit('message', message);
    };

    sinon.spy(fakeChannel, 'message');

    fakeChannel.on = sinon.stub();
    fakeChannel.off = sinon.stub();

    fakeRoom.channel = sinon.spy(function() {
      return fakeChannel;
    });

    var fakeUser = {
      id: '1'
    };

    fakeRoom.user = sinon.stub().yields(null, fakeUser);

    fakeScrollTracker = new Emitter();

    sinon.spy(fakeScrollTracker, 'on');

    sinon.spy(fakeScrollTracker, 'off');

    fakeScrollIndicator._options.room = fakeRoom;
    fakeScrollIndicator._scrollTracker = fakeScrollTracker;
  });

  describe ('Initialize', function() {

    afterEach(function() {
      eventIndicator.destroy();
    });

    it ('Initializes without errors', function() {
      eventIndicator = new EventIndicator(fakeScrollIndicator);
      eventIndicator.initialize();
    });

    it ('Initializes when namespace is specified', function() {
      fakeScrollIndicator._options.namespace = 'test-namespace';

      eventIndicator = new EventIndicator(fakeScrollIndicator);

      var namespace = fakeScrollIndicator._options.namespace;
      var id = fakeScrollIndicator._id;
      var fakeNamespace = CHANNEL_NAMESPACE + '-' + namespace + '-' + id;

      eventIndicator.initialize();
      sinon.assert.calledWith(eventIndicator._room.channel, fakeNamespace);
    });

    it ('Initializes when namespace is not specified', function() {
      eventIndicator = new EventIndicator(fakeScrollIndicator);

      var fakeNamespace = CHANNEL_NAMESPACE + '-' + fakeScrollIndicator._id;

      eventIndicator.initialize();
      sinon.assert.calledWith(eventIndicator._room.channel, fakeNamespace);
    });
  });

  describe ('Destroy', function() {

    beforeEach(function() {
      eventIndicator = new EventIndicator(fakeScrollIndicator);
      eventIndicator.initialize();
    });

    it ('Destroys without error', function() {
      eventIndicator.destroy();
    });

    it ('Calls scrollTracker.off', function() {
      eventIndicator.destroy();

      var scrollTracker = eventIndicator._scrollTracker;
      var listener = eventIndicator._scrollHandler;

      sinon.assert.called(scrollTracker.off);
      sinon.assert.calledWith(scrollTracker.off, 'scroll', listener);
    });

   it ('Calls channel.off', function() {
      eventIndicator.destroy();

      var channel = eventIndicator._channel;
      var listener = eventIndicator._messageListener;

      sinon.assert.called(channel.off);
      sinon.assert.calledWith(channel.off, 'message', listener);
    });
  });

  describe('Scroll Event', function() {

    beforeEach(function() {
      eventIndicator = new EventIndicator(fakeScrollIndicator);
      eventIndicator.initialize();
    });

    afterEach(function() {
      eventIndicator.destroy();
    });

    it ('Calls channel.message', function() {
      var fakeData = {
        direction: {
          up: false,
          down: true,
          left: false,
          right: false
        }
      };

      var channel = eventIndicator._channel;
      var errHandler = eventIndicator._errorHandler;
      var scrollTracker = eventIndicator._scrollTracker;

      scrollTracker.emit('scroll', fakeData);

      sinon.assert.called(channel.message);
      sinon.assert.calledWith(channel.message, fakeData.direction, errHandler);
    });

    it ('Throws when channel.message returns an error', function() {
      var fakeData = {
        direction: {
          up: false,
          down: true,
          left: false,
          right: false
        }
      };

      var fakeError = new Error('Failed to send message.');
      var channel = eventIndicator._channel;
      channel.message = sinon.stub().yields(fakeError);

      sinon.spy(eventIndicator, '_errorHandler');

      var scrollTracker = eventIndicator._scrollTracker;

      assert.exception(function() {
        scrollTracker.emit('scroll', fakeData);
      }, 'Failed to send message.');

    });

    it ('Calls view.addEventIndicator twice', function() {
      var fakeData = {
        up: false,
        down: true,
        left: true,
        right: false
      };

      eventIndicator._messageListener(fakeData, {userId: 'abc'});

      sinon.assert.calledTwice(eventIndicator._view.addEventIndicator);
    });

    it ('UI is not created when eventUI option is false', function() {
      eventIndicator._showUI = false;

      var fakeData = {
        up: false,
        down: true,
        left: true,
        right: false
      };

      eventIndicator._messageListener(fakeData, {userId: 'abc'});

      sinon.assert.notCalled(eventIndicator._view.addEventIndicator);
    });
  });

  describe('Error Handler', function() {
    var fakeError = null;

    beforeEach(function() {
      fakeError = new Error('Fake error.');

      eventIndicator = new EventIndicator(fakeScrollIndicator);
      eventIndicator.initialize();
    });

    afterEach(function() {
      eventIndicator.destroy();
    });

    it ('Callback returns the error', function() {
      var cb = sinon.stub();

      eventIndicator._errorHandler(fakeError, cb);

      sinon.assert.called(cb);
      sinon.assert.calledWith(cb, fakeError);
    });

    it ('Registered listener returns the error', function() {
      var errorHandler = sinon.stub();

      eventIndicator._emitter.on('error', errorHandler);
      eventIndicator._errorHandler(fakeError);

      sinon.assert.called(errorHandler);
    });

    it ('Error is thrown', function() {
      assert.exception(function() {
        eventIndicator._errorHandler(fakeError);
      }, 'Fake error.');
    });

  });

});
