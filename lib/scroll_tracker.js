/*jshint browser:true*/
/*global require, module */
'use strict';

/**
 * @fileOverview
 * Contains the ScrollTracker class, which is responsible for tracking scroll
 * events and re-emitting them at a throttled pace.
 */

var Emitter = require('emitter');
var _ = require('lodash');
var binder = require('binder');

/**
 * Instantiates the ScrollTracker instance.
 * @constructor
 * @param {HTMLElement} element
 */
function ScrollTracker() {
  this._element = window;
  this._emitter = new Emitter();

  // Make sure scrollHandler is called in the context of this object.
  _.bindAll(this, '_scrollHandler');

  // Initialize the position. This is used to determine what direction the user
  // is scrolling in.
  this._currentPosition = this._getPosition();

  // Call the scrollHandler at most 10 times per second.
  this._throttledHandler = _.throttle(this._scrollHandler, 100);

  // Track whether we are bound to the element's scroll event or not.
  this._isBound = false;
}

/**
 * Returns the current scroll position.
 * @return {object} An object with 'top' and 'left' properties.
 */
ScrollTracker.prototype.getPosition = function() {
  return this._currentPosition;
};

/**
 * Handler for when the scroll event is triggered on the element. Re-emits
 * the event to registered listeners.
 * @private
 */
ScrollTracker.prototype._scrollHandler = function() {
  var newPos = this._getPosition();

  this._emitter.emit('scroll', {
    direction: {
      up: newPos.top < this._currentPosition.top,
      down: newPos.top > this._currentPosition.top,
      left: newPos.left < this._currentPosition.left,
      right: newPos.left > this._currentPosition.left
    },

    position: newPos
  });

  this._currentPosition = newPos;
};

/**
 * Register for an event. The only supported event is "scroll".
 * @param {Event} event The event to listen for.
 * @param {function} listener The listener to call when the event occurs.
 */
ScrollTracker.prototype.on = function(event, listener) {
  this._emitter.on(event, listener);

  // Since we have at least one listener, bind to the element's event now.
  if (event === 'scroll' && !this._isBound) {
    binder.on(this._element, 'scroll', this._throttledHandler);
    this._isBound = true;
  }
};

/**
 * Remove a previously added event listener.
 * @param {Event} event The event to remove listeners for. If not supplied, all
 *                      listeners will be removed.
 * @param {function} listener The specific listener to remove. If not supplied,
 *                            all listeners will be removed for the event.
 */
ScrollTracker.prototype.off = function(event, listener) {
  this._emitter.off(event, listener);

  // Unbind from the element if there are no remaining listeners.
  if (!this._emitter.hasListeners('scroll') && this._isBound) {
    binder.off(this._element, 'scroll', this._throttledHandler);
    this._isBound = false;
  }
};

/**
 * Returns the current scroll position of the element.
 * @private
 * @return {object} Object with properties "top" and "left" for the current
 *                  scroll position of the element.
 */
ScrollTracker.prototype._getPosition = function() {
  var pos = { top: 0, left: 0 };

  if (this._element === window) {
    pos.top = window.pageYOffset || document.documentElement.scrollTop || 0;
    pos.left = window.pageXOffset || document.documentElement.scrollLeft || 0;
  } else {
    pos.top = this._element.scrollTop || 0;
    pos.left = this._element.scrollLeft || 0;
  }

  return pos;
};

module.exports = ScrollTracker;
