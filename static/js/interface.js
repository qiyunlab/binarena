"use strict";

/**!
 * @file Interface-related functions.
 * They do NOT directly access the master objects (e.g., "view" and "data")
 * defined by the window load event in "main.js".
 * But they may directly access the "document" object.
 */


/**
 * @summary Shared elements
 */

/**
 * Initiate button groups.
 * @function initBtnGroups
 */
function initBtnGroups() {
  var groups = document.getElementsByClassName('btn-group');
  for (var i = 0; i < groups.length; i++) {
    var btns = groups[i].getElementsByTagName('button');
    for (var j = 0; j < btns.length; j++) {
      btns[j].addEventListener('click', function () {
        if (!this.classList.contains('pressed')) {
          var btns = this.parentElement.getElementsByTagName('button');
          for (var i = 0; i < btns.length; i++) {
            if (btns[i] !== this) {
              btns[i].classList.remove('pressed');
            }
          }
          this.classList.add('pressed');
        }
      });
    }
  }
}


/**
 * Initiate panel show/hide buttons.
 * @function initShowHideBtns
 */
function initShowHideBtns() {
  var bars = document.getElementsByClassName('panel-head');
  for (var i = 0; i < bars.length; i++) {
    var btn = document.createElement('button');
    btn.innerHTML = '&#9699;';
    btn.title = 'Show/hide the ' + bars[i].textContent
      .toLowerCase() + ' panel';
    bars[i].appendChild(btn);
    btn.addEventListener('click', function () {
      var pnl = this.parentElement.nextElementSibling;
      if (pnl.style.display == 'block') {
        pnl.style.display = 'none';
        this.innerHTML = '&#9665;';
      } else {
        pnl.style.display = 'block';
        this.innerHTML = '&#9699;';
      }
    });
  }
}


/**
 * Initiate modal close buttons.
 * @function initCloseBtns
 */
function initCloseBtns() {
  var bars = document.getElementsByClassName('modal-head');
  for (var i = 0; i < bars.length; i++) {
    var btn = document.createElement('button');
    btn.innerHTML = '&times;';
    btn.classList.add('close');
    btn.title = 'Close the ' + bars[i].textContent
      .toLowerCase() + ' window';
    bars[i].appendChild(btn);
    btn.addEventListener('click', function () {
      this.parentElement.parentElement.parentElement.classList.add('hidden');
    });
  }
  // var btns = document.getElementsByClassName('close');
  // for (var i = 0; i < btns.length; i++) {
  //   btns[i].addEventListener('click', function () {
  //     this.parentElement.parentElement.parentElement.classList.add('hidden');
  //   });
  // }
}


/**
 * Generate a scale-to-HTML map.
 * @function getScale2HTML
 * @returns {Object} - scale-to-HTML map
 */
function getScale2HTML() {
  var res = {};
  var table = document.getElementById('scale-options');
  for (var i = 0; i < table.rows.length; i++) {
    for (var j = 0; j < table.rows[i].cells.length; j++) {
      var cell = table.rows[i].cells[j];
      res[cell.title] = cell.innerHTML;
    }
  }
  return res;
}


/**
 * @summary The following functions are for building auto-complete input boxes.
 * Modified based on the W3Schools tutorial:
 * @see https://www.w3schools.com/howto/howto_js_autocomplete.asp
 */

/**
 * Add auto-complete function to a text box.
 * @function autoComplete
 * @param {Object} inp - input text box
 * @param {*} arr - list of options
 */
function autoComplete(inp, arr) {
  var focus;
  inp.addEventListener('input', function () {
    var val = this.value;
    if (!val) return false;
    var div = document.getElementById('list-select');
    div.classList.add('hidden');
    div.style.width = this.style.width;
    var rect = this.getBoundingClientRect();
    div.style.top = rect.bottom + 'px';
    div.style.left = rect.left + 'px';
    var table = document.getElementById('list-options');
    table.setAttribute('data-target-id', inp.id);
    table.innerHTML = '';
    arr.forEach(function (itm) {
      var prefix = itm.substr(0, val.length);
      if (prefix.toUpperCase() === val.toUpperCase()) {
        var row = table.insertRow(-1);
        var cell = row.insertCell(-1);
        cell.innerHTML = '<strong>' + prefix + '</strong>' + itm.substr(val.length);
      }
    });
    div.classList.remove('hidden');
    focus = -1;
  });

  inp.addEventListener('keydown', function (e) {
    var table = document.getElementById('list-options');
    if (e.keyCode == 40) { // Down key
      focus ++;
      addActive(table);
    } else if (e.keyCode == 38) { // Up key
      focus --;
      addActive(table);
    } else if (e.keyCode == 13) { // Enter key
      e.preventDefault();
      if (focus > -1) {
        table.rows[focus].cells[0].click();
      }
    }
  });

  function addActive(table) {
    removeActive(table);
    if (focus >= table.rows.length) focus = 0;
    else if (focus < 0) focus = (table.rows.length - 1);
    table.rows[focus].cells[0].classList.add('active');
  }

  function removeActive(table) {
    for (var i = 0; i < table.rows.length; i++) {
      table.rows[i].cells[0].classList.remove('active');
    }
  }
}
