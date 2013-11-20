/*jshint browser:true */
/*global module, require */
'use strict';

/**
 * @fileOverview
 * Contains the EventIndicator class, which is responsible for updating the
 * indicator with who scrolled and in what direction.
 */

var _ = require('lodash');

var CHANNEL_NAMESPACE = 'goinstant-widgets-scroll-indicator';

/**
 * Instantiates the EventIndicator instance.
 * @constructor
 * @param {object} component The ScrollIndicator object.
 */

function EventIndicator(component) {
  this._scrollTracker = component._scrollTracker;
  this._userCache = component._userCache;
  this._emitter = component._emitter;
  this._view = component._view;
  this._id = component._id;
  this._showUI = component._options.eventUI;
  this._room = component._options.room;

  this._namespace = CHANNEL_NAMESPACE;

  if (component._options.namespace) {
    this._namespace += ('-' + component._options.namespace);
  }

  this._localUser = null;
  this._channel = null;

  _.bindAll(this, '_scrollHandler', '_messageListener', '_errorHandler');
}

/**
 * Initializes the EventIndicator by creating a channel and registering the
 * 'scroll' event to scrollTracker and binding the 'on' event to the channel.
 * @public
 * @param {function} cb A callback function.
 */
EventIndicator.prototype.initialize = function() {
  var self = this;

  var channelName = this._namespace + '-' + this._id;
  this._channel = this._room.channel(channelName);

  this._scrollTracker.on('scroll', self._scrollHandler);
  this._channel.on('message', self._messageListener);
};

/**
 * Destroys the EventIndicator instance.
 * @public
 * @param {function} cb A callback function.
 */
EventIndicator.prototype.destroy = function() {
  var self = this;

  this._scrollTracker.off('scroll', self._scrollHandler);
  this._channel.off('message', self._messageListener);
};

/**
 * Broadcasts a message to all users when a scroll event occurs.
 * @private
 * @param {object} data Contains the direction and position of the scroll.
 */
EventIndicator.prototype._scrollHandler = function(data) {
  // Get the up to date local user object
  var localUser = this._userCache.getLocalUser();

  this._emitter.emit('localScrollChange', localUser, data.direction);

  this._channel.message(data.direction, this._errorHandler);
};

/**
 * Handles the a message's contents to update the indicator with a new
 * direction and user information.
 * @private
 * @param {object} msg A message containing the direction and position of the
 *                     scroll.
 * @param {object} context An object containing data about the message.
 */
EventIndicator.prototype._messageListener = function(data, context) {
  var self = this;

  var id = context.userId;
  var user = this._userCache.getUser(id);

  this._emitter.emit('remoteScrollChange', user, data.direction);

  // Handle Show UI option
  if (!this._showUI) {
    return;
  }

  _.each(data, function(key, direction) {
    if (key) {
      self._view.addEventIndicator(user, direction);
    }
  });
};

/**
 * Callback the error if a callback is provided. If no callback passed and
 * emitter has registered listeners, emit the error. If there is no callback or
 * listener, throw the error
 * @private
 * @param {object} err An error object.
 * @param {function} cb Optional callback function.
 */
EventIndicator.prototype._errorHandler = function(err, cb) {
  if (!err) {
    return;
  }

  if (_.isFunction(cb)) {
    return cb(err);
  }

  if (this._emitter.hasListeners('error')) {
    return this._emitter.emit('error', err);
  }

  throw err;
};

module.exports = EventIndicator;
