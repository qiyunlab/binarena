"use strict";

/**!
 * @module search
 * @file Search functions.
 * @description The search panel is located at the 1st position of the dash
 * panel. The user may select a field and specify criteria of search. The
 * function will find and select contigs that meet the criteria.
 */


/**
 * Initialize search panel controls.
 * @function initMiniPlotCtrl
 * @params {Object} mo - main object
 */
function initSearchCtrl(mo) {

  // Changed search field.
  byId('search-field-sel').addEventListener('change', function (e) {
    searchFieldChange(e, mo);
  });

  // Toggle inclusion/exclusion of lower/upper bounds.
  byId('min-btn').addEventListener('click', function () {
    if (this.innerHTML === '[') {
      this.innerHTML = '(';
      this.title = 'Lower bound excluded';
    } else {
      this.innerHTML = '[';
      this.title = 'Lower bound included';
    }
  });

  byId('max-btn').addEventListener('click', function () {
    if (this.innerHTML === ']') {
      this.innerHTML = ')';
      this.title = 'Upper bound excluded';
    } else {
      this.innerHTML = ']';
      this.title = 'Upper bound included';
    }
  });

  // Toggle case strict mode and whole cell matching mode.
  for (let key of ['case', 'whole']) {
    byId(key + '-btn').addEventListener('click', function () {
      this.classList.toggle('pressed');
    });
  }

  // Let user press Enter to triggle search.
  for (let key of ['min', 'max', 'cat-sel', 'fea-sel', 'des-sel']) {
    byId(key + '-txt').addEventListener('keyup', function (e) {
      if (e.key === 'Enter') byId('search-btn').click();
    });
  }

  // Launch search function.
  byId('search-btn').addEventListener('click', function () {
    searchByCriteria(mo);
  });

}


/**
 * Update search panel controls by data columns.
 * @function updateSearchCtrl
 * @params {Object} cols - cols object
 */
function updateSearchCtrl(cols) {
  const names = cols.names,
        types = cols.types;
  const sel = byId('search-field-sel');
  sel.innerHTML = '';

  // create an empty option
  sel.add(document.createElement('option'));

  // create an option for each column
  let type, opt;
  const n = names.length;
  for (let i = 0; i < n; i++) {
    type = types[i];
    if (type === 'id' || type.endsWith('wt')) continue;
    opt = document.createElement('option');
    opt.value = i;
    opt.text = names[i];
    sel.add(opt);
  }
}


/**
 * Search field change event.
 * @function searchFieldChange
 * @param {Object} e - event object
 * @param {Object} mo - main object
 */
function searchFieldChange(e, mo) {
  const cols = mo.cols,
        view = mo.view;

  for (let key of ['num', 'cat', 'fea', 'des']) {
    byId(key + '-sel-p').classList.add('hidden');
  }
  byId('search-btn').style.visibility = 'hidden';
  const span = byId('str-match-span');
  span.classList.add('hidden');

  // show controls by field type
  let i = e.target.value;
  if (i === '') return;
  i = parseInt(i);
  let p;
  switch (cols.types[i]) {

    case 'num':
      byId('num-sel-p').classList.remove('hidden');
      break;

    case 'cat':
      p = byId('cat-sel-p');
      p.lastElementChild.appendChild(span);
      // p.appendChild(span);
      span.classList.remove('hidden');
      p.classList.remove('hidden');
      autoComplete(byId('cat-sel-txt'), Object.keys(mo.cache.freqs[i]).sort());
      break;

    case 'fea':
      p = byId('fea-sel-p');
      p.lastElementChild.appendChild(span);
      // p.appendChild(span);
      span.classList.remove('hidden');
      p.classList.remove('hidden');
      autoComplete(byId('fea-sel-txt'), Object.keys(mo.cache.freqs[i]).sort());
      break;

    case 'des':
      p = byId('des-sel-p');
      p.lastElementChild.appendChild(span);
      // p.appendChild(span);
      span.classList.remove('hidden');
      p.classList.remove('hidden');
      break;
  }
  byId('search-btn').style.visibility = 'visible';
}


/**
 * Search contigs by criteria.
 * @function searchByCriteria
 * @param {Object} mo - main object
 * @returns {boolean} whether search is successful
 */
function searchByCriteria(mo) {
  let col = byId('search-field-sel').value;
  if (col === '') {
    toastMsg('No search criterion was specified.', mo.stat);
    return false;
  }
  col = parseInt(col);

  // filter contigs by currently specified criteria
  const mask = mo.mask;
  const hasMask = (Object.keys(mask).length > 0);

  // search by threshold
  const arr = mo.data[col];
  const n = arr.length;
  const type = mo.cols.types[col];
  const ctgs = [];
  if (type === 'num') {

    // validate minimum and maximum thresholds
    let min = byId('min-txt').value,
        max = byId('max-txt').value;
    if (min === '' && max === '') {
      toastMsg('Must specify minimum and/or maximum thresholds.', mo.stat);
      return false;
    }
    if (min === '') min = null;
    else if (isNaN(min)) {
      toastMsg('Invalid minimum threshold was specified.', mo.stat);
      return false;
    } else min = Number(min);
    if (max === '') max = null;
    else if (isNaN(max)) {
      toastMsg('Invalid maximum threshold was specified.', mo.stat);
      return false;
    } else max = Number(max);

    // whether to include lower and upper bounds
    const minIn = (byId('min-btn').innerHTML === '['),
          maxIn = (byId('max-btn').innerHTML === '[');

    // compare values to threshold(s)
    let val;
    for (let i = 0; i < n; i++) {
      if (hasMask && i in mask) continue;
      val = arr[i];
      if ((val !== NaN) &&
        (min === null || (minIn ? (val >= min) : (val > min))) &&
        (max === null || (maxIn ? (val <= max) : (val < max)))) {
          ctgs.push(i);
      }
    }
  }

  // search by keyword
  else {
    let text = byId(type + '-sel-txt').value;
    if (text === '') {
      toastMsg('Must specify a keyword.', mo.stat);
      return false;
    }
    const mcase = byId('case-btn').classList.contains('pressed');
    if (!mcase) text = text.toUpperCase();
    const mwhole = byId('whole-btn').classList.contains('pressed');

    let val;
    for (let i = 0; i < n; i++) {
      if (hasMask && i in mask) continue;
      val = arr[i];

      // category or description
      if (type !== 'fea') {
        if (val === '') continue;
        if (!mcase) val = val.toUpperCase();
        if (mwhole ? (val === text) : (val.indexOf(text) > -1))
          ctgs.push(i);
      }

      // feature
      else {
        for (let key in val) {
          if (mwhole ? (key === text) : (key.indexOf(text) > -1)) {
            ctgs.push(i);
            break;
          }
        }
      }
    }
  }

  treatSelection(ctgs, mo.stat.selmode, mo.stat.masking, mo);
  return true;
}
