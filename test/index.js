/*jshint browser:true */
/*global require*/

/**
 * @fileOverview
 * Contains unit tests for the ScrollIndicator component.
 */

describe('ScrollIndicator', function() {
  'use strict';
  /*jshint -W031 */ // Ignore use of 'new' for side effects in these tests

  var assert = window.assert;

  var ScrollIndicator = require('scroll-indicator');

  var mockRoom = {};

  describe('constructor', function() {
    it('throws if missing a room', function() {
      assert.exception(function() {
        new ScrollIndicator({});
      }, /Invalid room option/);
    });

    it('throws if an invalid threshold is passed', function() {
      assert.exception(function() {
        new ScrollIndicator({ room: mockRoom, threshold: 'foo' });
      }, /Invalid threshold option/);

      assert.exception(function() {
        new ScrollIndicator({ room: mockRoom, threshold: -1 });
      }, /Invalid threshold option/);

      assert.exception(function() {
        new ScrollIndicator({ room: mockRoom, threshold: 2 });
      }, /Invalid threshold option/);
    });

    it('throws if a non-boolean eventUI flag is passed', function() {
      assert.exception(function() {
        new ScrollIndicator({ room: mockRoom, eventUI: 'foo' });
      }, /Invalid eventUI option/);
    });

    it('throws if a non-boolean positionUI flag is passed', function() {
      assert.exception(function() {
        new ScrollIndicator({ room: mockRoom, positionUI: 'foo' });
      }, /Invalid positionUI option/);
    });

    it('throws if a non-number displayTimer is passed', function() {
      assert.exception(function() {
        new ScrollIndicator({ room: mockRoom, displayTimer: 'foo' });
      }, /Invalid displayTimer option/);
    });

    it('throws if a non-string namespace is passed', function() {
      assert.exception(function() {
        new ScrollIndicator({ room: mockRoom, namespace: true });
      }, /Invalid namespace option/);
    });

    it('throws if unexpected options are passed', function() {
      assert.exception(function() {
        new ScrollIndicator({ room: mockRoom, foo: 'bar' });
      }, /Unsupported options: foo/);
    });

  });
});
