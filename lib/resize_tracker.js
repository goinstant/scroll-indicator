/*jshint browser:true */
/*global module, require */
'use strict';

/**
 * @fileOverview
 * Contains the ResizeTracker class, which is responsible for tracking the size
 * of elements and emitting events when the size changes.
 */

var Emitter = require('emitter');
var _ = require('lodash');
var binder = require('binder');

/**
 * Instantiates a ResizeTracker instance.
 *
 * @constructor
 */
function ResizeTracker() {
  this._emitter = new Emitter();
  this._elem = window;

  _.bindAll(this, '_resizeHandler');

  // Debounce the resizeHandler so that it is only called after there have been
  // no resize events for 500ms.
  this._debouncedResizeHandler = _.debounce(this._resizeHandler, 500);

  this._interval = null;
  this._isBound = false;

  // Initialize the cached size of the element.
  this._size = this._findSize();
}

/**
 * Register for an event. The only supported event is "resize".
 * @param {Event} event The event to listen for.
 * @param {function} listener The listener to call when the event occurs.
 */
ResizeTracker.prototype.on = function(event, listener) {
  this._emitter.on(event, listener);

  // Since we have at least one listener, bind to the element's event now.
  if (event === 'resize' && !this._isBound) {
    this._bind();
  }
};

/**
 * Remove a previously added event listener.
 * @param {Event} event The event to remove listeners for. If not supplied, all
 *                      listeners will be removed.
 * @param {function} listener The specific listener to remove. If not supplied,
 *                            all listeners will be removed for the event.
 */
ResizeTracker.prototype.off = function(event, listener) {
  this._emitter.off(event, listener);

  // Unbind from the element if there are no remaining listeners.
  if (!this._emitter.hasListeners('resize') && this._isBound) {
    this._unbind();
  }
};

/**
 * Gets the last-calculated size of the tracked element.
 * @return {object} An object with "width" and "height" properties.
 */
ResizeTracker.prototype.getSize = function() {
  return this._size;
};

/**
 * Handler for when the "resize" event fires (if tracking the window) or when
 * the interval fires (if tracking a non-window element). Updates the cached
 * size and emits a "resize" event if it has changed.
 * @private
 */
ResizeTracker.prototype._resizeHandler = function() {
  var newSize = this._findSize();

  // Only emit an event if the size has changed.
  if (newSize.width !== this._size.width ||
      newSize.height !== this._size.height) {

    this._size = newSize;
    this._emitter.emit('resize', this._size);
  }
};

/**
 * Binds to the element, starting the tracking.
 * @private
 */
ResizeTracker.prototype._bind = function() {
  if (this._elem === window) {
    binder.on(this._elem, 'resize', this._debouncedResizeHandler);
  } else {
    this._interval = window.setInterval(this._resizeHandler, 500);
  }

  this._isBound = true;
};

/**
 * Unbinds from the element, stopping the tracking.
 * @private
 */
ResizeTracker.prototype._unbind = function() {
  if (this._elem === window) {
    binder.off(this._elem, 'resize', this._debouncedResizeHandler);
  } else {
    window.clearInterval(this._interval);
    this._interval = null;
  }

  this._isBound = false;
};

/**
 * Returns the current size of the element.
 * @private
 * @return {object} An object with "width" and "height" properties.
 */
ResizeTracker.prototype._findSize = function() {
  // TODO : Support non-window elements
  // clientWidth/Height is for IE8.
  var size = {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight
  };

  return size;
};

module.exports = ResizeTracker;
