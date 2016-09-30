'use strict';

var SearchBarController = require('../../controllers/search-bar-controller');
var unroll = require('../util').unroll;

describe('SearchBarController', function () {  
  var template;
  var testEl;
  var input;
  var dropdown;
  var dropdownItems;
  var ctrl;
  var clock;

  before(function () {
    template = 
      '<div class="search-bar__lozenges" data-ref="searchBarLozenges"></div>' +
      '<input data-ref="searchBarInput">' +
      '<input data-ref="searchBarInputHidden">' +
      '<div data-ref="searchBarDropdown">' +
      '<div>Narrow your search</div>' +
      '<ul>' +
      '<li data-ref="searchBarDropdownItem">' +
      '<span data-ref="searchBarDropdownItemTitle">' +
      'user:' +
      '</span>' +
      '</li>' +
      '<li data-ref="searchBarDropdownItem">' +
      '<span data-ref="searchBarDropdownItemTitle">' +
      'tag:' +
      '</span>' +
      '</li>' +
      '<li data-ref="searchBarDropdownItem">' +
      '<span data-ref="searchBarDropdownItemTitle">' +
      'url:' +
      '</span>' +
      '</li>' +
      '<li data-ref="searchBarDropdownItem">' +
      '<span data-ref="searchBarDropdownItemTitle">' +
      'group:' +
      '</span>' +
      '</li>' +
      '</ul>' +
      '</div>';
  });

  beforeEach(function () {
    testEl = document.createElement('div');
    testEl.innerHTML = template;

    ctrl = new SearchBarController(testEl);

    input = ctrl.refs.searchBarInput;
    dropdown = ctrl.refs.searchBarDropdown;
    dropdownItems = testEl.querySelectorAll('[data-ref="searchBarDropdownItem"]');

    clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    ctrl = null;
    clock.restore();
  });

  describe('Dropdown tests:', function () {
    it('dropdown appears when the input field has focus', function () {
      input.dispatchEvent(new Event('focusin'));
      assert.isTrue(dropdown.classList.contains('is-open'));
    });

    it('dropdown is hidden when the input field loses focus', function () {
      input.dispatchEvent(new Event('focusin'));
      input.dispatchEvent(new Event('focusout'));
      assert.isFalse(dropdown.classList.contains('is-open'));
    });

    it('selects facet from dropdown on mousedown', function () {
      input.dispatchEvent(new Event('focusin'));
      dropdownItems[0].dispatchEvent(new Event('mousedown'));
      assert.equal(input.value, 'user:');
    });

    it('highlights facet on up arrow', function () {
      var e = new Event('keydown');
      e.keyCode = 38;
      input.dispatchEvent(new Event('focusin'));
      input.dispatchEvent(e);
      assert.isTrue(dropdownItems[3].classList.contains('js-search-bar-dropdown-menu-item--active'));
    });

    it('highlights facet on down arrow', function () {
      var e = new Event('keydown');
      e.keyCode = 40;
      input.dispatchEvent(new Event('focusin'));
      input.dispatchEvent(e);
      assert.isTrue(dropdownItems[0].classList.contains('js-search-bar-dropdown-menu-item--active'));
    });

    it('highlights the correct facet for a combination of mouseover, up and down arrow keys', function () {
      var e = new Event('keydown');
      // down arrow to #1
      e.keyCode = 40;
      input.dispatchEvent(new Event('focusin'));
      input.dispatchEvent(e);
      assert.isTrue(dropdownItems[0].classList.contains('js-search-bar-dropdown-menu-item--active'));
      // mouseover #3
      dropdownItems[2].dispatchEvent(new Event('mouseover'));
      assert.isFalse(dropdownItems[0].classList.contains('js-search-bar-dropdown-menu-item--active'));
      assert.isTrue(dropdownItems[2].classList.contains('js-search-bar-dropdown-menu-item--active'));
      // up arrow to #2
      e.keyCode = 38;
      input.dispatchEvent(e);
      assert.isFalse(dropdownItems[2].classList.contains('js-search-bar-dropdown-menu-item--active'));
      assert.isTrue(dropdownItems[1].classList.contains('js-search-bar-dropdown-menu-item--active'));
      // mouseover #3
      dropdownItems[2].dispatchEvent(new Event('mouseover'));
      assert.isFalse(dropdownItems[1].classList.contains('js-search-bar-dropdown-menu-item--active'));
      assert.isTrue(dropdownItems[2].classList.contains('js-search-bar-dropdown-menu-item--active'));
      // down arrow to #4
      e.keyCode = 40;
      input.dispatchEvent(e);
      assert.isFalse(dropdownItems[2].classList.contains('js-search-bar-dropdown-menu-item--active'));
      assert.isTrue(dropdownItems[3].classList.contains('js-search-bar-dropdown-menu-item--active'));
    });

    it('selects facet on enter', function () {
      var e1 = new Event('keydown');
      e1.keyCode = 40;
      var e2 = new Event('keydown');
      e2.keyCode = 13;
      input.dispatchEvent(new Event('focusin'));
      input.dispatchEvent(e1);
      input.dispatchEvent(e2);
      assert.equal(input.value, 'user:'); 
    });

    it('dropdown stays open when clicking on a part of it that is not one of the suggestions', function () {
      input.dispatchEvent(new Event('focusin'));
      dropdown.querySelector('div').dispatchEvent(new Event('mousedown'));
      assert.isTrue(dropdown.classList.contains('is-open'));
    });

    it('search options narrow as input changes', function () {
      input.dispatchEvent(new Event('focusin'));
      input.value = 'g';
      input.dispatchEvent(new Event('input'));
      assert.isTrue(dropdownItems[0].classList.contains('is-hidden'));
      assert.isFalse(dropdownItems[1].classList.contains('is-hidden'));
      assert.isTrue(dropdownItems[2].classList.contains('is-hidden'));
      assert.isFalse(dropdownItems[3].classList.contains('is-hidden'));
    });

    it('highlights the correct facet from narrowed dropdown items on up and down arrow keys', function () {
      var e = new Event('keydown');
      input.dispatchEvent(new Event('focusin'));
      input.value = 'g';
      input.dispatchEvent(new Event('input'));
      // keycode for 'up'
      e.keyCode = 40;
      input.dispatchEvent(new Event('focusin'));
      input.dispatchEvent(e);
      // down arrow to first visible item
      assert.isTrue(dropdownItems[1].classList.contains('js-search-bar-dropdown-menu-item--active'));
      // up arrow to last visible item
      e.keyCode = 38;
      input.dispatchEvent(e);
      assert.isFalse(dropdownItems[1].classList.contains('js-search-bar-dropdown-menu-item--active'));
      assert.isTrue(dropdownItems[3].classList.contains('js-search-bar-dropdown-menu-item--active'));
    });

    it('dropdown closes when user types ":"', function () {
      input.dispatchEvent(new Event('focusin'));
      input.value = ':';
      input.dispatchEvent(new Event('input'));
      assert.isFalse(dropdown.classList.contains('is-open'));
    });

    it('dropdown closes when there are no matches', function () {
      input.dispatchEvent(new Event('focusin'));
      input.value = 'x';
      input.dispatchEvent(new Event('input'));
      assert.isFalse(dropdown.classList.contains('is-open'));
    });
  });

  describe('Lozenge tests:', function () {
    unroll('should create lozenge on space for', function (fixture) {
      var e1 = new Event('keydown');
      e1.keyCode = 32;
      input.dispatchEvent(new Event('focusin'));
      input.value = fixture.input;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(e1);
      assert.equal(testEl.querySelector('.lozenge-content').textContent, fixture.output);
    },[
      {input: 'foo', output: 'foo'},
      {input: '    foo    ', output: 'foo'},
      {input: '"foo bar"', output: '"foo bar"'},
      {input: '\'foo bar\'', output: '\'foo bar\''},
      {input: 'foo:"bar"', output: 'foo:"bar"'},
      {input: 'foo:\'bar\'', output: 'foo:\'bar\''},
      {input: 'foo:\'bar1 bar2\'', output: 'foo:\'bar1 bar2\''},
      {input: 'foo:"bar1 bar2"', output: 'foo:"bar1 bar2"'},
      {input: 'foo:', output: 'foo:'},
      {input: '\'foo\':', output: '\'foo\':'},
      {input: '"foo":', output: '"foo":'},
      {input: 'foo"bar:', output: 'foo"bar:'},
      {input: 'foo\'bar:', output: 'foo\'bar:'},
    ]);

    unroll('should not create lozenge on space for', function (fixture) {
      var e1 = new Event('keydown');
      e1.keyCode = 32;
      input.dispatchEvent(new Event('focusin'));
      input.value = fixture.input;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(e1);
      assert.isNull(testEl.querySelector('.lozenge-content'));
    },[
      {input: '\'foo'},
      {input: '"foo'},
      {input: 'foo:bar"'},
      {input: 'foo:"bar'},
      {input: 'foo:\'bar'},
      {input: 'foo:bar\''},
      {input: '"foo:'},
      {input: 'foo":'},
      {input: '\'foo:'},
      {input: 'foo\':'},
      {input: '     '},
    ]);
  });
});
