/*jshint browser:true */
/*global require */

/**
 * @fileOverview
 * Contains unit tests for the IndicatorView class.
 */

describe('IndicatorView', function() {
  'use strict';

  var $ = require('jquery');
  var _ = require('lodash');
  var IndicatorView = require('scroll-indicator/lib/indicator_view.js');
  var colors = require('colors-common');
  var assert = window.assert;
  var sinon = window.sinon;

  var view;
  var clock;
  var user = {
    id: 'id1',
    displayName: 'Tim'
  };
  user[colors.USER_PROPERTY] = '#f00';

  beforeEach(function() {
    clock = sinon.useFakeTimers();
    view = new IndicatorView(1000);
  });

  afterEach(function() {
    view.destroy();
    clock.restore();
  });

  function className(direction) {
    return '.gi-scroll-' + direction;
  }

  function countIndicators(direction) {
    return $(className(direction)).children().size();
  }

  function getIndicatorText(direction) {
    return $(className(direction)).children().first().text();
  }

  function backgroundColor(direction) {
    return $(className(direction)).children().first().css('background-color');
  }

  it('Adds containers to hold the indicators', function() {
    var numContainers = $('div').not('#mocha').size();

    assert.equal(numContainers, 5); // extra container is down+right box.
  });

  it('Adds position indicators', function() {
    view.addPositionIndicator(user, 'up');

    assert.equal(countIndicators('up'), 1);
  });

  it('Only adds one position indicator per user/direction', function() {
    view.addPositionIndicator(user, 'up');
    view.addPositionIndicator(user, 'up');

    assert.equal(countIndicators('up'), 1);
  });

  it('Adds a new position indicator for each user', function() {
    var user2 = _.clone(user);
    user2.id = 'id2';

    view.addPositionIndicator(user, 'up');
    view.addPositionIndicator(user2, 'up');

    var numIndicators = countIndicators('up');
    assert.equal(numIndicators, 2);
  });

  it('Removes position indicators', function() {
    var user2 = _.clone(user);
    user2.id = 'id2';

    view.addPositionIndicator(user, 'up');
    view.addPositionIndicator(user2, 'up');

    view.removePositionIndicator(user, 'up');
    assert.equal(countIndicators('up'), 1);

    view.removePositionIndicator(user2, 'up');
    assert.equal(countIndicators('up'), 0);
  });

  it('Adds event indicators', function() {
    view.addEventIndicator(user, 'up');

    assert.equal(countIndicators('up'), 1);
  });

  it('Removes event indicators after timeout', function() {
    view.addEventIndicator(user, 'up');
    clock.tick(1000);

    assert.equal(countIndicators('up'), 0);
  });

  it('Tracks the timeout separately for each user', function() {
    var user2 = _.clone(user);
    user2.id = 'id2';

    view.addEventIndicator(user, 'up');
    clock.tick(500);
    view.addEventIndicator(user2, 'up');

    assert.equal(countIndicators('up'), 2);

    clock.tick(500);
    assert.equal(countIndicators('up'), 1);

    clock.tick(500);
    assert.equal(countIndicators('up'), 0);
  });

  it('Replaces position indicator with event indicator', function() {
    view.removePositionIndicator(user, 'up');
    view.addEventIndicator(user, 'up');

    assert.equal(countIndicators('up'), 1);
    assert.match(getIndicatorText('up'), /scrolling/i);
  });

  it('Restores position indicator when event indicator is removed', function() {
    view.addPositionIndicator(user, 'up');
    view.addEventIndicator(user, 'up');
    clock.tick(1000);

    assert.equal(countIndicators('up'), 1);
    assert.match(getIndicatorText('up'), /viewing/i);
  });

  it('Does not restore position indicator if it is removed', function() {
    view.addPositionIndicator(user, 'up');
    view.addEventIndicator(user, 'up');
    view.removePositionIndicator(user, 'up');

    assert.equal(countIndicators('up'), 1);
    assert.match(getIndicatorText('up'), /scrolling/i);

    clock.tick(1000);

    assert.equal(countIndicators('up'), 0);
  });

  it('Can change display names', function() {
    view.addPositionIndicator(user, 'up');
    view.addEventIndicator(user, 'down');

    user.displayName = 'newName';
    view.changeName(user);

    assert.match(getIndicatorText('up'), /newName/);
    assert.match(getIndicatorText('down'), /newName/);
  });

  it('Can change color', function() {
    view.addPositionIndicator(user, 'up');
    view.addEventIndicator(user, 'down');

    var expected = window.addEventListener ? 'rgb(255, 0, 0)' : '#f00';

    assert.equal(backgroundColor('up'), expected);
    assert.equal(backgroundColor('down'), expected);

    user[colors.USER_PROPERTY] = '#00f';
    view.changeColor(user);

    expected = window.addEventListener ? 'rgb(0, 0, 255)' : '#00f';

    assert.equal(backgroundColor('up'), expected);
    assert.equal(backgroundColor('down'), expected);
  });

});
