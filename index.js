/*jshint browser:true */
/*global require, module */
'use strict';

var Emitter = require('emitter');
var async = require('async');
var _ = require('lodash');

var UserCache = require('usercache');
var colors = require('colors-common');

var ScrollTracker = require('./lib/scroll_tracker');
var ResizeTracker = require('./lib/resize_tracker');
var EventIndicator = require('./lib/event_indicator');
var PositionIndicator = require('./lib/position_indicator');
var IndicatorView = require('./lib/indicator_view');

/**
 * @fileOverview
 * This file contains the ScrollIndicator class, which functions as an
 * interface to the ScrollIndicator Component's various settings.
 */

 var KEY_NAMESPACE = 'goinstant/widgets/scroll-indicator';
 var CHANNEL_NAMESPACE = 'goinstant-widgets-scroll-indicator';

/**
 * A list of the supported options.
 * @const
 */
var SUPPORTED_OPTIONS = [
  'room',
  'displayTimer',
  'eventUI',
  'positionUI',
  'threshold',
  'namespace'
];

/**
 * The option defaults. Any option not listed here is required.
 * @const
 */
var DEFAULT_OPTIONS = {
  displayTimer: 1000,
  eventUI: true,
  positionUI: true,
  threshold: 0.75,
  namespace: ''
};

/**
 * A list of supported events to listen for
 * @const
 */
var SUPPORTED_EVENTS = [
  'error',
  'remoteScrollChange',
  'localScrollChange',
  'remotePositionChange',
  'localPositionChange'
];

/**
 * Regex that validates whether a keyName refers to the user's displayName.
 * @const
 */
var DISPLAYNAME_REGEX = /\/displayName$/;

/**
  * @constructor
  */
function ScrollIndicator(opts) {
  this._options = this._validateOptions(opts);

  this._options.keyNamespace = KEY_NAMESPACE;
  this._options.channelNamespace = CHANNEL_NAMESPACE;

  if (this._options.namespace) {
    this._options.keyNamespace += ('/' + this._options.namespace);
    this._options.channelNamespace += ('-' + this._options.namespace);
  }

  delete this._options.namespace;

  // Choose an identifier for this element.
  // TODO: Need a more robust solution here
  this._id = 'window';

  this._emitter = new Emitter();

  this._view = new IndicatorView(this._options.displayTimer);

  this._scrollTracker = new ScrollTracker();
  this._resizeTracker = new ResizeTracker();

  this._userCache = new UserCache(this._options.room);

  this._eventIndicator = new EventIndicator(this);

  this._positionIndicator = new PositionIndicator(this);

  _.bindAll(this, '_handleUserChange');
}

/**
 * Initializes the component.
 *
 * @param {function} cb The function to call after initialization is complete.
 */
ScrollIndicator.prototype.initialize = function(cb) {
  var self = this;

  this._userCache.on('change', this._handleUserChange);

  this._userCache.initialize(function(err) {
    if (err) {
      return cb(err);
    }

    var tasks = [];

    var eventIndicator = self._eventIndicator;
    tasks.push(_.bind(eventIndicator.initialize, eventIndicator));

    var positionIndicator = self._positionIndicator;
    tasks.push(_.bind(positionIndicator.initialize, positionIndicator));

    async.parallel(tasks, cb);
  });
};

/**
 * Destroys the component.
 *
 * @param {function} cb The function to call after destruction is complete.
 */
ScrollIndicator.prototype.destroy = function(cb) {
  var tasks = [];

  // Remove all emitter listeners. This is a synchronous operation.
  this._emitter.off();

  // Destroy the view. This is a synchronous operation.
  this._view.destroy();

  var userCache = this._userCache;
  tasks.push(_.bind(userCache.destroy, userCache));

  var eventIndicator = this._eventIndicator;
  tasks.push(_.bind(eventIndicator.destroy, eventIndicator));

  var positionIndicator = this._positionIndicator;
  tasks.push(_.bind(positionIndicator.destroy, positionIndicator));

  async.parallel(tasks, cb);
};

/**
 * Registers an event listener.
 * Supported events:
 *  * 'error'
 *
 * @param {string} event The name of the event to listen for.
 * @param {function} listener The listener function for the event.
 */
ScrollIndicator.prototype.on = function(event, listener) {
  if (!_.contains(SUPPORTED_EVENTS, event)) {
    throw new Error('Invalid event.');
  }

  if (!listener) {
    throw new Error('Listener is required');
  }

  if (!_.isFunction(listener)) {
    throw new Error('Listener must be a function');
  }

  this._emitter.on(event, listener);
};

/**
 * Removes an event listener. See {@link #on} for a list of supported events.
 *
 * @param {string} [event] The name of the event to remove. If not supplied,
 *        all listeners will be removed for all events.
 * @param {function} [listener] The listener to remove. If not supplied,
 *        all listeners will be removed for the event.
 */
ScrollIndicator.prototype.off = function(event, listener) {
  if (!_.isFunction(listener)) {
    throw new Error('Listener must be a function');
  }

  this._emitter.off(event, listener);
};

/**
 * Validates the supplied options. Returns the valid options, populated with
 * defaults, if valid.
 *
 * @private
 * @param {object} opts The options object as supplied by customer code.
 * @return {object} The valid options, extended with defaults for any missing
 *         values.
 * @throws {Error} If the customer-supplied options are missing required values
 *         or contains unsupported values.
 */
ScrollIndicator.prototype._validateOptions = function(opts) {
  // Check to see if the customer code supplied any options that are not
  // supported.
  var suppliedOptions = _.keys(opts);
  var difference = _.difference(suppliedOptions, SUPPORTED_OPTIONS);
  if (difference.length > 0) {
    throw new Error('Unsupported options: ' + difference.join(','));
  }

  opts = _.defaults(opts, DEFAULT_OPTIONS);

  if (!opts.room || !_.isObject(opts.room)) {
    throw new Error('Invalid room option');
  }

  if (!_.isNumber(opts.threshold) || opts.threshold < 0.0 ||
      opts.threshold > 1.0) {
    throw new Error('Invalid threshold option');
  }

  if (!_.isBoolean(opts.eventUI)) {
    throw new Error('Invalid eventUI option');
  }

  if (!_.isBoolean(opts.positionUI)) {
    throw new Error('Invalid positionUI option');
  }

  if (!_.isNumber(opts.displayTimer)) {
    throw new Error('Invalid displayTimer option');
  }

  if (!_.isString(opts.namespace)) {
    throw new Error('Invalid namespace option');
  }

  return opts;
};

/**
 * Handler for errors that occur outside of the public interface (e.g. when
 * no user code callbacks are available). Will emit the error if there are
 * registered listeners, otherwise will throw the error.
 * @param {Error} err The error to emit or throw.
 */
ScrollIndicator.prototype._handleError = function(err) {
  if (this._emitter.hasListeners('error')) {
    return this._emitter.emit('error', err);
  }

  throw err;
};

/**
 * Handler for when a user property changes.
 * @param {object} user The updated user object that changed.
 * @param {string} key The name of the key that changed under the user.
 */
ScrollIndicator.prototype._handleUserChange = function(user, key) {
  if (DISPLAYNAME_REGEX.test(key)) {
    return this._view.changeName(user);
  }

  if (colors.isUserProperty(key)) {
    return this._view.changeColor(user);
  }
};

module.exports = ScrollIndicator;
