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
  ['case-btn', 'whole-btn'].forEach(id => {
    byId(id).addEventListener('click', function () {
      this.classList.toggle('pressed');
    });
  });

  // Let user press Enter to triggle search.
  ['min-txt', 'max-txt', 'cat-sel-txt', 'fea-sel-txt', 'des-sel-txt']
    .forEach(id => { byId(id).addEventListener('keyup', function (e) {
      if (e.key === 'Enter') byId('search-btn').click();
    });
  });

  // Launch search function.
  byId('search-btn').addEventListener('click', function () {
    searchByCriteria(mo);
  });

}


/**
 * Update search panel controls by data.
 * @function updateSearchCtrl
 * @params {Object} data - data object
 */
function updateSearchCtrl(data) {
  const cols = data.cols,
        types = data.types;
  const sel = byId('search-field-sel');
  sel.innerHTML = '';

  // create an empty option
  sel.add(document.createElement('option'));

  // create an option for each column
  let opt;
  const n = cols.length;
  for (let i = 0; i < n; i++) {
    if (types[i] === 'id') continue;    
    opt = document.createElement('option');
    opt.value = i;
    opt.text = cols[i];
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
  const data = mo.data,
        view = mo.view;

  ['num-sel-p', 'cat-sel-p', 'fea-sel-p', 'des-sel-p'].forEach(id => {
    byId(id).classList.add('hidden');
  });
  byId('search-btn').style.visibility = 'hidden';
  const span = byId('str-match-span');
  span.classList.add('hidden');

  // show controls by field type
  let i = e.target.value;
  if (i === '') return;
  i = parseInt(i);
  let p;
  switch (data.types[i]) {

    case 'number':
      byId('num-sel-p').classList.remove('hidden');
      break;

    case 'category':
      p = byId('cat-sel-p');
      p.lastElementChild.appendChild(span);
      // p.appendChild(span);
      span.classList.remove('hidden');
      p.classList.remove('hidden');
      autoComplete(byId('cat-sel-txt'),
        Object.keys(view.categories[data.cols[i]]).sort());
      break;

    case 'feature':
      p = byId('fea-sel-p');
      p.lastElementChild.appendChild(span);
      // p.appendChild(span);
      span.classList.remove('hidden');
      p.classList.remove('hidden');
      autoComplete(byId('fea-sel-txt'),
        Object.keys(view.features[data.cols[i]]).sort());
      break;

    case 'description':
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
  const data = mo.data,
        mask = mo.mask;
  let col = byId('search-field-sel').value;
  if (col === '') {
    toastMsg('No search criterion was specified.', mo.stat);
    return false;
  }
  col = parseInt(col);
  const type = data.types[col];

  // filter contigs by currently specified criteria
  const ctgs = [];
  const hasMask = (Object.keys(mask).length > 0);
  const df = data.df;
  const n = df.length;

  // search by threshold
  if (type === 'number') {

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
      val = df[i][col];
      if ((val !== null) &&
        (min === null || (minIn ? (val >= min) : (val > min))) &&
        (max === null || (maxIn ? (val <= max) : (val < max)))) {
          ctgs.push(i);
      }
    }
  }

  // search by keyword
  else {
    let text = byId(type.substring(0, 3) + '-sel-txt').value;
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
      val = df[i][col];
      if (val === null) continue;

      // category or description
      if (type !== 'feature') {
        if (type === 'category') val = val[0];
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
