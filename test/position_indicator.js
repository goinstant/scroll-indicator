/*jshint browser:true */
/*global require */

/**
 * @fileOverview
 * Contains unit tests for the PositionIndicator class.
 */

describe('PositionIndicator', function() {
  'use strict';

  var assert = window.assert;
  var sinon = window.sinon;

  var PositionIndicator =
    require('scroll-indicator/lib/position_indicator.js');
  var Emitter = require('emitter');

  var KEY_NAMESPACE = 'goinstant/widgets/scroll-indicator';

  var mockUser;
  var mockKey;
  var mockRoom;
  var mockComponent;
  var positionIndicator;
  var remoteUser;
  var size;
  var keyName;

  beforeEach(function(done) {
    mockUser = {
      id: 'id1'
    };

    mockKey = {
      set: sinon.spy(),
      remove: sinon.stub().yields(),
      key: function(keyName) {
        mockKey.name = this.name + '/' + keyName;
        return mockKey;
      },
      name: ''
    };

    var userKey = {
      key: function(keyName) {
        mockKey.name = keyName;
        return mockKey;
      }
    };

    mockRoom = {
      user: sinon.stub().yields(null, mockUser, userKey),
      self: sinon.stub().returns(userKey)
    };

    var mockScrollTracker = new Emitter();
    mockScrollTracker.getPosition = function() { return {top: 0, left: 0 }; };

    mockComponent = {
      _id: 'elemId',
      _options: {
        room: mockRoom,
        positionUI: true,
        threshold: 0.75
      },
      _scrollTracker: mockScrollTracker,
      _resizeTracker: new Emitter(),
      _userCache: new Emitter(),
      _emitter: new Emitter(),
      _view: {
        addPositionIndicator: sinon.spy(),
        removePositionIndicator: sinon.spy()
      }
    };

    remoteUser = {
      id: 'id2',
      goinstant: {
        components: {
          'scroll-indicator': {
            elemId: {
              position: { top: 0, bottom: 0, left: 100, right: 100 },
              size: { width: 100, height: 100 }
            }
          }
        }
      }
    };

    size = { width: 100, height: 100 };
    mockComponent._resizeTracker.getSize = sinon.stub().returns(size);
    mockComponent._userCache.getAll = sinon.stub().returns([remoteUser]);
    mockComponent._userCache.getLocalUser = sinon.stub().returns(mockUser);
    mockComponent._userCache.getLocalUserKey = sinon.stub().returns(userKey);

    positionIndicator = new PositionIndicator(mockComponent);
    positionIndicator.initialize(done);

    keyName = positionIndicator._keyName();
  });

  it('sets the namespace correctly when provided', function() {
    mockComponent._options.namespace = 'test-namespace';

    positionIndicator = new PositionIndicator(mockComponent);

    var namespace = mockComponent._options.namespace;

    assert.equal(
      positionIndicator._keyName(),
      KEY_NAMESPACE + '/' + namespace + '/' + mockComponent._id
    );
  });

  it('sets the namespace correctly when not provided', function() {
    delete mockComponent._options.namespace;

    positionIndicator = new PositionIndicator(mockComponent);

    assert.equal(
      positionIndicator._keyName(),
      KEY_NAMESPACE + '/' + mockComponent._id
    );
  });

  it('sets the key when scrolling', function() {
    var position = { top: 100, left: 100 };
    mockComponent._scrollTracker.emit('scroll', { position: position });

    var expected = {
      position: { top: 100, left: 100, bottom: 200, right: 200 },
      size: { width: 100, height: 100 }
    };

    sinon.assert.calledWith(mockKey.set, expected);
  });

  it('sets the key when resizing', function() {
    size.width = 200;
    mockComponent._resizeTracker.emit('resize', size);

    var expected = {
      position: { top: 0, left: 0, bottom: 100, right: 200 },
      size: { width: 200, height: 100 }
    };

    sinon.assert.calledWith(mockKey.set, expected);
  });

  it('adds an indicator for remote user below', function() {
    remoteUser.goinstant.components['scroll-indicator'].elemId.position = {
      top: 100, left: 0, bottom: 200, right: 100
    };
    mockComponent._userCache.emit('change', remoteUser, keyName);

    sinon.assert.calledWith(mockComponent._view.addPositionIndicator,
                            remoteUser, 'down');
  });

  it('never adds an indicator for the local user', function() {
    positionIndicator._updateIndicator(mockUser);

    sinon.assert.notCalled(mockComponent._view.addPositionIndicator);
  });

  it('does not add an indicator when positionUI is false', function() {
    positionIndicator._showUI = false;
    remoteUser.goinstant.components['scroll-indicator'].elemId.position = {
      top: 100, left: 0, bottom: 200, right: 100
    };
    mockComponent._userCache.emit('change', remoteUser, keyName);

    sinon.assert.notCalled(mockComponent._view.addPositionIndicator);
  });

  it('adds an indicator for remote user above', function() {
    remoteUser.goinstant.components['scroll-indicator'].elemId.position = {
      top: -100, left: 0, bottom: 0, right: 100
    };
    mockComponent._userCache.emit('change', remoteUser, keyName);

    sinon.assert.calledWith(mockComponent._view.addPositionIndicator,
                            remoteUser, 'up');
  });

  it('adds an indicator for remote user to the left', function() {
    remoteUser.goinstant.components['scroll-indicator'].elemId.position = {
      top: 0, left: -100, bottom: 100, right: 0
    };
    mockComponent._userCache.emit('change', remoteUser, keyName);

    sinon.assert.calledWith(mockComponent._view.addPositionIndicator,
                            remoteUser, 'left');
  });

  it('adds an indicator for remote user to the right', function() {
    remoteUser.goinstant.components['scroll-indicator'].elemId.position = {
      top: 0, left: 100, bottom: 100, right: 200
    };
    mockComponent._userCache.emit('change', remoteUser, keyName);

    sinon.assert.calledWith(mockComponent._view.addPositionIndicator,
                            remoteUser, 'right');
  });

  it('removes all indicators when a user leaves', function() {
    // Ignore any calls due to the initialize function.
    mockComponent._view.removePositionIndicator.reset();

    mockComponent._userCache.emit('leave', remoteUser);
    sinon.assert.callCount(mockComponent._view.removePositionIndicator, 4);
  });

  it('removes handlers on destroy', function(done) {
    positionIndicator.destroy(function(err) {
      assert.ifError(err);

      // Ignore any calls to the initialize function.
      mockComponent._view.addPositionIndicator.reset();

      var position = { top: 100, left: 100 };
      mockComponent._scrollTracker.emit('scroll', { position: position });

      var size = { width: 200, height: 200 };
      mockComponent._resizeTracker.emit('resize', size);

      remoteUser.goinstant.components['scroll-indicator'].elemId.position = {
        top: 1000, left: 1000, bottom: 1100, right: 1100
      };
      mockComponent._userCache.emit('change', remoteUser, keyName);

      sinon.assert.calledOnce(mockKey.set);
      sinon.assert.notCalled(mockComponent._view.addPositionIndicator);

      done();
    });
  });

});
