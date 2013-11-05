/*jshint browser:true */
/*global module, require */
'use strict';

/**
 * @fileOverview
 * This file contains the PositionIndicator class, which is used to track and
 * display the relative position of remote user's viewports.
 */

var _ = require('lodash');

var KEY_NAMESPACE = 'goinstant/widgets/scroll-indicator';

/**
 * @constructor
 */
function PositionIndicator(component) {
  this._component = component;
  this._room = component._options.room;
  this._scrollTracker = component._scrollTracker;
  this._resizeTracker = component._resizeTracker;
  this._userCache = component._userCache;
  this._view = component._view;
  this._showUI = component._options.positionUI;
  this._emitter = component._emitter;

  // The position of the local user's viewport.
  this._position = this._scrollTracker.getPosition();

  // Initialize the bottom/right position values.
  var size = this._resizeTracker.getSize();
  this._position.bottom = this._position.top + size.height;
  this._position.right = this._position.left + size.width;

  // Percentage of the remote screen that has to be "off" our screen to count
  // as looking at a different "place"
  this._threshold = component._options.threshold;

  this._namespace = KEY_NAMESPACE;

  // The key and object for the local platform user.
  this._userKey = this._room.self();

  //var positionKeyNamespace = this._namespace + '/' + component._id;

  if (component._options.namespace) {
    this._positionKey = this._userKey.key(this._namespace).key(component._options.namespace).key(component._id);
  } else {
    this._positionKey = this._userKey.key(this._namespace).key(component._id);
  }

  _.bindAll(this, '_scrollHandler', '_resizeHandler', '_updateIndicator',
                  '_changeHandler', '_leaveHandler', '_callback');
}

/**
 * Initializes the instance. After initialization, all platform and local
 * listeners will be set up for responding to position changes.
 *
 * @param {function} cb The function to call when initialization is complete.
 */
PositionIndicator.prototype.initialize = function(cb) {
  // Add the local event handlers.
  this._scrollTracker.on('scroll', this._scrollHandler);
  this._resizeTracker.on('resize', this._resizeHandler);
  this._userCache.on('change', this._changeHandler);
  this._userCache.on('leave', this._leaveHandler);

  // Do an initial population of the indicator view.
  this._updateIndicators();

  // And store the initial position in platform.
  this._storeData();

  cb();
};

/**
 * Destroys the instance. Clears all added handlers.
 *
 * @param {function} cb The function to call when teardown is complete.
 */
PositionIndicator.prototype.destroy = function(cb) {
  // Remove the local event handlers.
  this._scrollTracker.off('scroll', this._scrollHandler);
  this._resizeTracker.off('resize', this._resizeHandler);
  this._userCache.off('change', this._changeHandler);
  this._userCache.off('leave', this._leaveHandler);

  // Remove the stored key data. This will cause the indicator to disappear
  // on remote clients.
  var key = this._positionKey;
  key.remove(cb);
};

/**
 * Handler for when the scroll event fires on the element.
 *
 * @private
 * @param {object} data The event data as returned from the
 *                 {@link ScrollTracker}.
 */
PositionIndicator.prototype._scrollHandler = function(data) {
  this._position = data.position;
  var size = this._resizeTracker.getSize();

  // The scrollTracker only gives us the top/left. Manually calculate the
  // bottom/right using the element's size/width.
  this._position.bottom = this._position.top + size.height;
  this._position.right = this._position.left + size.width;

  // Update all indicators based on our new position.
  this._updateIndicators();
  // Store the new information in platform.
  this._storeData();
};

/**
 * Handler for when the element size changes.
 *
 * @private
 */
PositionIndicator.prototype._resizeHandler = function(newSize) {
  // Recalculate the bottom/right of the element based on the
  // new size.
  this._position.bottom = this._position.top + newSize.height;
  this._position.right = this._position.left + newSize.width;

  // Update all indicators based on our new size.
  this._updateIndicators();
  // Store the new information in platform.
  this._storeData();
};

/**
 * Stores the local position and size data in platform for remote clients to
 * access.
 *
 * @private
 */
PositionIndicator.prototype._storeData = function() {
  var data = {
    position: this._position,
    size: this._resizeTracker.getSize()
  };

  var key = this._positionKey;
  key.set(data, { bubble: true, local: true }, this._callback);

  this._emitter.emit('localPositionChange',
                     this._userCache.getLocalUser(), data);
};

/**
 * Updates the indicators for all remote users.
 *
 * @private
 */
PositionIndicator.prototype._updateIndicators = function() {
  _.each(this._userCache.getAll(), this._updateIndicator);
};

/**
 * Updates the indicator for one remote user.
 *
 * @private
 * @param {object} user The remote user object.
 */
PositionIndicator.prototype._updateIndicator = function(user) {
  var id = this._component._id;
  var self = this;

  // Never show indicators for the local user.
  if (user.id === this._userCache.getLocalUser().id) {
    return;
  }

  var positionData = user.goinstant && user.goinstant.components &&
    user.goinstant.components['scroll-indicator'] &&
    user.goinstant.components['scroll-indicator'][id];

  // Just hide any indicators if the user doesn't have position data (this
  // happens when the remote user destroys their component).
  if (!positionData) {
    _.each(['up', 'down', 'left', 'right'], function(direction) {
      self._view.removePositionIndicator(user, direction);
    });
    return;
  }

  var directions = this._determineDirections(positionData);

  var data = positionData;
  data.direction = directions;

  // Emit the event for remote users
  this._emitter.emit('remotePositionChange', user, data);

  if (!this._showUI) {
    return;
  }

  _.each(directions, function(isInDirection, direction) {
    if (isInDirection) {
      self._view.addPositionIndicator(user, direction);
    } else {
      self._view.removePositionIndicator(user, direction);
    }
  });
};

/**
 * Handles a change to remote user data. If the change was a remote version
 * of this component, will update the indicators to reflect the remote user's
 * position.
 *
 * @private
 * @param {object} user The remote user object.
 * @param {string} keyName The keyName indicating what changed within the user.
 */
PositionIndicator.prototype._changeHandler = function(user, keyName) {
  // Ignore changes to the user object that don't involve the component data.
  var regexp = new RegExp(this._keyName() + '$');
  if (!keyName.match(regexp)) {
    return;
  }

  this._updateIndicator(user);
};

/**
 * Clears all indicators when a user leaves the room.
 *
 * @private
 * @param {object} user The remote user object.
 */
PositionIndicator.prototype._leaveHandler = function(user) {
  var self = this;

  // Clear any indicators that may exist for the user that left.
  _.each(['up', 'down', 'left', 'right'], function(direction) {
    self._view.removePositionIndicator(user, direction);
  });
};

/**
 * Determines the direction of the remote viewport relative to the local
 * viewport.
 *
 * @private
 * @param {object} remoteData The position/size data for the remote user.
 * @return {object} An object with four properties, one for each direction,
 *         that each contain a boolean flag indicating whether the user viewport
 *         is off in that direction.
 */
PositionIndicator.prototype._determineDirections = function(remoteData) {
  // Percentage of their screen that is above the top of ours.
  var ratioAbove = (this._position.top - remoteData.position.top) /
                    remoteData.size.height;

  // Percentage of their screen that is below the bottom of ours.
  var ratioBelow = (remoteData.position.bottom - this._position.bottom) /
                    remoteData.size.height;

  // Percentage of their screen that is to the left of ours.
  var ratioLeft = (this._position.left - remoteData.position.left) /
                   remoteData.size.width;

  // Percentage of their screen that is to the right of ours.
  var ratioRight = (remoteData.position.right - this._position.right) /
                    remoteData.size.width;

  var direction = {
    up: ratioAbove > this._threshold,
    down: ratioBelow > this._threshold,
    left: ratioLeft > this._threshold,
    right: ratioRight > this._threshold
  };

  return direction;
};

/**
 * Returns the partial name of the key where data should be stored underneath
 * the user key. Exposed for testing.
 *
 * @private
 * @return {string} The sub-key name.
 */
PositionIndicator.prototype._keyName = function() {
  return this._positionKey.name;
};

/**
 * Callback for calls to the server.
 */
PositionIndicator.prototype._callback = function(err) {
  if (err) {
    this._component._handleError(err);
  }
};

module.exports = PositionIndicator;
