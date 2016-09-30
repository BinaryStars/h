'use strict';

var Controller = require('../base/controller');
var LozengeHelper = require('../util/lozenge-helper');

class LozengeController extends Controller {
  constructor(el) {
    super(el);
    el.querySelector('.js-lozenge-close').addEventListener('mousedown', () => {
      // remove the DOM element
      el.remove();
      // update input field
      this._inputHidden = document.querySelector('.js-search-bar').querySelector('.js-search-bar__input-hidden');

      var queryTerms = LozengeHelper.getQueryTerms(this._inputHidden.value);
      queryTerms = queryTerms.map(function(term) {
        if (term !== el.querySelector('.js-lozenge-content').textContent) {
          return term;
        }
      });
      this._inputHidden.value = queryTerms.join(' ');
      // submit form
      document.querySelector('.js-search-bar').querySelector('form').submit();
    });
  }
}

module.exports = LozengeController;
