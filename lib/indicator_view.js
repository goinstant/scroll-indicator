/*jshint browser:true */
/*global module, require */
'use strict';

/**
 * @fileOverview
 * Contains the IndicatorView class, which handles the manipulation of the
 * indicator UI for scrolling event and position indicators.
 */

var _ = require('lodash');
var data = require('data');
var colors = require('colors-common');

var tmpl = require('../templates/template.html');

/**
 * Relative wording for the different directions.
 * @const
 */
var RELATIVE_WORDING = {
  up: 'above',
  down: 'below',
  left: 'to the left',
  right: 'to the right'
};

var CLASS_OVERRIDE = 'gi-override';
var CLASS_INDICATOR = 'gi-scroll';

/**
 * Instantiates the IndicatorView instance.
 *
 * The IndicatorView supports two "types" of indicators: "position" and "event".
 * Event indicators inform the user that the remote user is actively scrolling,
 * while position indicators confer the relative position of the remote user's
 * viewport.
 *
 * The general behaviour of this class can be summed up as follows:
 *  - Event/position indicators stack in the same container, and may be
 *    intermixed.
 *  - There is only one indicator shown per user/direction at a time.
 *  - If event and position indicators for the same user/direction are
 *    concurrent, the event indicator is shown and the position indicator is
 *    hidden.
 *  - The event indicator times out. Calling {@link #showEventIndicator} again
 *    with the same arguments resets the timer.
 *  - The position indicator must be explicitly removed with
 *    {@link #removePositionIndicator}.
 *
 * @constructor
 */
function IndicatorView(displayTimer) {
  // If these indicators are for the window, pretend the container is the body
  // instead.
  var element = document.body;

  this._displayTimer = displayTimer;

  this._containers = {};

  this._containers.downRight = document.createElement('div');
  this._containers.downRight.className = CLASS_OVERRIDE + ' ' +
                                         CLASS_INDICATOR + '-down-right';

  this._containers.up = document.createElement('div');
  this._containers.up.className = CLASS_OVERRIDE + ' ' +
                                  CLASS_INDICATOR + '-up';

  this._containers.right = document.createElement('div');
  this._containers.right.className = CLASS_OVERRIDE + ' ' +
                                     CLASS_INDICATOR + '-right';

  this._containers.left = document.createElement('div');
  this._containers.left.className = CLASS_OVERRIDE + ' ' +
                                    CLASS_INDICATOR + '-left';

  this._containers.down = document.createElement('div');
  this._containers.down.className = CLASS_OVERRIDE + ' ' +
                                    CLASS_INDICATOR + '-down';

  this._containers.downRight.appendChild(this._containers.down);
  this._containers.downRight.appendChild(this._containers.right);

  element.appendChild(this._containers.up);
  element.appendChild(this._containers.left);
  element.appendChild(this._containers.downRight);

  // Track the event indicator timeouts for each direction, indexed by user.
  // TODO : This could result in many simultaneous timeouts, which is bad for
  // performance. We could use the class in platform/client/util/timeouts.js
  // to address this.
  this._timeouts = {
    up: {},
    down: {},
    left: {},
    right: {}
  };
}

/**
 * Destroys the view. Removes all stored data and elements from the page. This
 * view is unuseable after calling this function.
 */
IndicatorView.prototype.destroy = function() {
  _.each(this._containers, function(container) {
    // Remove all the stored data for all indicators.
    var indicators = container.querySelectorAll('.' + CLASS_INDICATOR);
    _.each(indicators, function(el) {
      data(el).del();
    });

    // Remove the container.
    container.parentNode.removeChild(container);
  });

  // Clear all timeouts that may be running.
  _.each(this._timeouts, function(timeouts) {
    _.each(timeouts, function(timeout) {
      window.clearTimeout(timeout);
    });
  });
};

/**
 * Adds an event indicator for the specified user and direction. The indicator
 * will automatically expire and remove itself. An event indicator replaces
 * a position indicator (if it exists), and restores the position indicator
 * when it is removed.
 *
 * @param {User} user The user object.
 * @param {string} direction The direction. One of "up", "down", "left", "right"
 */
IndicatorView.prototype.addEventIndicator = function(user, direction) {
  var self = this;

  // Reset the timeout for removing the indicator
  window.clearTimeout(this._timeouts[direction][user.id]);
  var removeFn = _.bind(this.removeEventIndicator, this, user, direction);
  this._timeouts[direction][user.id] =
    window.setTimeout(removeFn, self._displayTimer);

  var el = this._findIndicator(user, direction);
  var msg = this._getEventMsg(user, direction);

  if (el) {
    data(el).set('eventMsg', msg);
    var msgEl = el.querySelector('.' + CLASS_INDICATOR + '-msg');
    msgEl.textContent = msgEl.innerText = msg; // IE8 uses innerText
    return;
  }

  el = this._createIndicator(user, direction, msg);
  data(el).set({ id: user.id, eventMsg: msg });
};

/**
 * Removes an event indicator. Normally this will be called from a timeout set
 * in {@link #addEventIndicator}, but you can call it directly.
 *
 * @param {User} user The user object.
 * @param {string} direction The direction. One of "up", "down", "left", "right"
 */
IndicatorView.prototype.removeEventIndicator = function(user, direction) {
  window.clearTimeout(this._timeouts[direction][user.id]);
  delete this._timeouts[direction][user.id];

  var el = this._findIndicator(user, direction);

  if (!el) {
    return;
  }

  var positionMsg = data(el).get('positionMsg');
  if (positionMsg) {
    data(el).del('eventMsg');
    var msgEl = el.querySelector('.' + CLASS_INDICATOR + '-msg');
    msgEl.textContent = msgEl.innerText = positionMsg; // IE8 uses innerText
    return;
  }

  data(el).del();
  el.parentNode.removeChild(el);
};

/**
 * Adds a position indicator for the given user/direction combination.
 *
 * @param {User} user The user object.
 * @param {string} direction The direction. One of "up", "down", "left", "right"
 */
IndicatorView.prototype.addPositionIndicator = function(user, direction) {
  var el = this._findIndicator(user, direction);

  var msg = this._getPositionMsg(user, direction);

  if (el) {
    data(el).set('positionMsg', msg);
    return;
  }

  el = this._createIndicator(user, direction, msg);
  data(el).set({ id: user.id, positionMsg: msg });
};

/**
 * Removes the position indicator for the given user/direction combination.
 *
 * @param {User} user The user object.
 * @param {string} direction The direction. One of "up", "down", "left", "right"
 */
IndicatorView.prototype.removePositionIndicator = function(user, direction) {
  var el = this._findIndicator(user, direction);

  if (!el) {
    return;
  }

  // If there is no event message, remove the indicator entirely.
  if (!data(el).get('eventMsg')) {
    data(el).del();
    el.parentNode.removeChild(el);
    return;
  }

  // Delete the position message data and let the event indicator remain.
  data(el).del('positionMsg');
};

/**
 * Changes the user's displayed name.
 * @param {object} user The user to change the indicators for. Must contain the
 *                      updated display name.
 */
IndicatorView.prototype.changeName = function(user) {
  var self = this;
  _.each(['up', 'down', 'left', 'right'], function(direction) {
    var el = self._findIndicator(user, direction);
    if (el) {
      var msg;

      if (data(el).get('positionMsg')) {
        msg = self._getPositionMsg(user, direction);
        data(el).set('positionMsg', msg);
      }

      if (data(el).get('eventMsg')) {
        msg = self._getEventMsg(user, direction);
        data(el).set('eventMsg', msg);
      }

      var msgEl = el.querySelector('.' + CLASS_INDICATOR + '-msg');
      msgEl.textContent = msgEl.innerText = msg; // IE8 uses innerText
    }
  });
};

/**
 * Changes the indicator color for the given user.
 * @param {object} user The user to change the indicators for. Must contain the
 *                      updated color.
 */
IndicatorView.prototype.changeColor = function(user) {
  var self = this;
  _.each(['up', 'down', 'left', 'right'], function(direction) {
    var el = self._findIndicator(user, direction);
    if (el) {
      el.style.backgroundColor = colors.get(user);
    }
  });
};

/**
 * Finds the .gi-scroll wrapper element for the specified
 * user/direction.
 *
 * @private
 * @param {User} user The user object.
 * @param {string} direction The direction. One of "up", "down", "left", "right"
 * @return {HTMLElement} The wrapper element if it exists, or null.
 */
IndicatorView.prototype._findIndicator = function(user, direction) {
  var found = null;
  var container = this._containers[direction];
  var existing = container.querySelectorAll('.' + CLASS_INDICATOR);

  _.each(existing, function(el) {
    var stored = data(el).get();
    if (stored.id === user.id) {
      found = el;
      return false;
    }
  });

  return found;
};

/**
 * Creates an returns an indicator element. Element is already appended to
 * container.
 *
 * @private
 * @param {User} user The user object.
 * @param {string} direction The direction. One of "up", "down", "left", "right"
 * @param {string} msg The Indicator content.
 */
IndicatorView.prototype._createIndicator = function(user, direction, msg) {
  var color = colors.get(user);

  var html = _.template(tmpl, { message: msg, color: color });
  var container = this._containers[direction];

  var div = document.createElement('div');
  div.innerHTML = html;
  return container.appendChild(div.removeChild(div.children[0]));
};

/**
 * Returns the text content for an event indicator.
 * @param {object} user The user object.
 * @param {string} direction The direction the user is scrolling in.
 */
IndicatorView.prototype._getEventMsg = function(user, direction) {
  var displayName = _.isString(user.displayName) ? user.displayName : '';
  return displayName + ' is scrolling ' + direction + '.';
};

/**
 * Returns the text content for a position indicator.
 * @param {object} user The user object.
 * @param {string} direction The direction of the user's viewport.
 */
IndicatorView.prototype._getPositionMsg = function(user, direction) {
  var displayName = _.isString(user.displayName) ? user.displayName : '';
  var relative = RELATIVE_WORDING[direction];
  return displayName + ' is viewing the page ' + relative + '.';
};

module.exports = IndicatorView;
