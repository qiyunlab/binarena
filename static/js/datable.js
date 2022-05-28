"use strict";

/**!
 * @module datable
 * @file Data table functions.
 */


/**
 * Initialize data table controls.
 * @function initDataTableCtrl
 * @param {Object} mo - main object
 */
function initDataTableCtrl(mo) {

  // menu button click (same as context menu)
  byId('export-table-btn').addEventListener('click', function () {
    exportDataTable(mo);
  });

  // move to previous page
  byId('data-prev-btn').addEventListener('click', function () {
    const table = byId('data-table');
    let n = parseInt(table.getAttribute('data-nctg')),
        p = parseInt(table.getAttribute('data-ipage'));
    fillDataTable(mo, undefined, n, p - 1);
  });

  // move to next page
  byId('data-next-btn').addEventListener('click', function () {
    const table = byId('data-table');
    let n = parseInt(table.getAttribute('data-nctg')),
        p = parseInt(table.getAttribute('data-ipage'));
    fillDataTable(mo, undefined, n, p + 1);
  });

  // enter page number and jump
  byId('data-page-txt').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      const table = byId('data-table');
      const p = parseInt(this.value);
      const P = parseInt(table.getAttribute('data-npage'));
      if (!Number.isNaN(p) && p >= 1 && p <= P) {
        const n = parseInt(table.getAttribute('data-nctg'));
        fillDataTable(mo, undefined, n, p - 1);
      } else {
        this.value = parseInt(table.getAttribute('data-ipage')) + 1;
      }
    };
  });

}


/**
 * @constant FIELD_NAMES
 */
 const FIELD_NAMES = {
  'id':  'identifier',   // id
  'num': 'numeric',     // numeric
  'cat': 'categorical', // categorical
  'fea': 'feature set', // feature set
  'des': 'descriptive'  // descriptive
};

/**
 * @constant FIELD_NAMES
 */
 const FIELD_WIDTHS = {
  'id':  50,
  'num': 75,
  'cat': 100,
  'fea': 150,
  'des': 150
};


/**
 * Initiate data table based on data.
 * @function buildDataTable
 * @param {Object} mo - main object
 */
function buildDataTable(mo) {
  const cols = mo.cols;
  const names = cols.names,
        types = cols.types;

  // table
  const table = byId('data-table');
  table.setAttribute('data-sort', '');   // sort by which column
  table.setAttribute('data-order', '');  // ascending (0) or descending (1)
  table.setAttribute('data-arrow', '');  // index of sorted head (not column)
  table.innerHTML = '';

  // table head
  const thead = table.createTHead();
  const row = thead.insertRow(-1);
  const n = names.length;
  let cell, name, type, btn;
  let w = 0;

  // create individual head cells
  for (let i = 0; i < n; i++) {
    name = names[i];
    type = types[i];
    if (type.endsWith('wt')) continue; // skip weight
    cell = document.createElement('th');
    cell.setAttribute('data-idx', i);      // column index
    cell.setAttribute('data-name', names); // column name
    cell.setAttribute('data-type', types); // column type
    cell.style.backgroundColor = mo.theme.typecolors[type];
    cell.title = `Field: ${name}\nType: ${FIELD_NAMES[type]}`;
    if (type === 'num') cell.classList.add('sortable');
    cell.innerHTML = names[i];

    // click head to sort a column
    cell.addEventListener('click', function () {
      sortByColumn(this, mo);
    });

    // delete field
    if (i) {
      btn = document.createElement('button');
      btn.innerHTML = '&#x2715;'; // cross mark
      btn.title = 'Delete field';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        // e.preventDefault();
        deleteColumn(this.parentElement, mo);
      });
      cell.appendChild(btn);
    }
    row.appendChild(cell);

    // one has to set both header cell widths and table width in order to get
    // them to work
    cell.style.width = FIELD_WIDTHS[type] + 'px';
    w += FIELD_WIDTHS[type];
  }
  table.style.width = w + 'px';
  table.appendChild(document.createElement('tbody'));
}


/**
 * Sort data table by column.
 * @function sortByColumn
 * @param {Object} th - table head to sort by
 * @param {Object} mo - main object
 */
function sortByColumn(th, mo) {
  const table = th.parentElement.parentElement.parentElement;
  const idx = parseInt(th.getAttribute('data-idx'));
  if (mo.cols.types[idx] !== 'num') return;

  // clear arrow of previously sorted head
  const prev = parseInt(table.getAttribute('data-arrow'));
  if (prev && prev !== th.cellIndex) {
    const prev_cell = table.tHead.rows[0].cells[prev];
    prev_cell.classList.remove('descending');
    prev_cell.classList.remove('ascending');
  }

  // same head, toggle order
  let order;
  if (idx === parseInt(table.getAttribute('data-sort'))) {
    order = !parseInt(table.getAttribute('data-order'));
    table.setAttribute('data-order', Number(order));
  }
  
  // new head, default is descending order (true)
  else {
    order = true;
    table.setAttribute('data-sort', idx);
    table.setAttribute('data-order', 1);
    table.setAttribute('data-arrow', th.cellIndex);
  }

  // draw arrow
  th.classList.toggle('descending', order);
  th.classList.toggle('ascending', !order);

  // sort by column and update table
  sortDataTable(mo, idx, order);
  fillDataTable(mo, 'Dataset');
}


/**
 * Delete data column.
 * @function deleteColumn
 * @param {Object} th - table head to delete
 * @param {Object} mo - main object
 */
function deleteColumn(th, mo) {
  const data = mo.data,
        view = mo.view,
        cols = mo.cols,
        cache = mo.cache;
  const names = cols.names,
        types = cols.types;

  // data field index
  let idx = parseInt(th.getAttribute('data-idx'));

  let n = names.length;
  let type = types[idx];
  if (type === 'num') {

    // must keep at least two numeric fields
    if (types.filter(x => x === 'num').length < 3) return;

    // reset special fields
    if (idx === cache.splen) cache.splen = 0;
    if (idx === cache.spcov) cache.spcov = 0;
  }

  // decide number of fields to delete (add weight if available)
  let k = (idx + 1 < n && types[idx + 1].endsWith('wt')) ? 2 : 1;

  // delete data
  data.splice(idx, k);
  names.splice(idx, k);
  types.splice(idx, k);

  // delete cache category / feature frequencies
  // delete membership lists
  // shift the remaining ones
  for (const obj of [cache.freqs, mo.mems]) {
    if (idx in obj) delete obj[idx];
    const keys = Object.keys(obj);
    for (const key of keys) {
      if (key > idx) {
        obj[key - k] = obj[key];
        delete obj[key];
      }
    }
  }

  // table column index
  idx = th.cellIndex;
  let row = th.parentElement;

  // change display items if needed
  let changed = false;
  const keys = ['x', 'y', 'size', 'opacity', 'color'];
  for (const key of keys) {
    if (idx === view[key].i) {
      changed = true;
      
      // for others, remove display
      if (key !== 'x' && key !== 'y') view[key].i = 0;

      // for axes, find another numeric field
      else {
        for (let i = 1; i < names.length; i ++) {
          if (types[i] === 'num') {
            if ((key === 'x' && i !== view['y'].i) ||
                (key === 'x' && i !== view['y'].i)) {
              view[key].i = i;
              break;
            }
          }
        }
      }
      view[key].scale = 'none';
    }
  }

  // reset plot if needed
  if (changed) resetView(mo);

  // shift indices of subsequent columns
  const cells = row.cells;
  for (let i = idx + 1; i < cells.length; i ++) {
    cells[i].setAttribute('data-idx', parseInt(cells[i].getAttribute(
      'data-idx')) - k);
  }

  // delete table column
  row.deleteCell(idx);
  const table = row.parentElement.parentElement;
  const rows = table.tBodies[0].rows;
  for (let i = 0; i < rows.length; i ++) {
    rows[i].deleteCell(idx);
  }

  updateDisplayCtrl(cols, view);
  updateColorMap(mo);
  updateControls(mo);
  buildInfoTable(mo);
}


/**
 * Populate data table by data.
 * @function fillDataTable
 * @param {Object} mo - main object
 * @param {string} [title] - title of data table (use current if omitted)
 * @param {number} [n=100] - number of contigs to show per page
 * @param {number} [p=0] - page number (starting from 0)
 */
function fillDataTable(mo, title, n, p) {
  const data = mo.data,
        cols = mo.cols;
  const tabled = mo.tabled;
  let N = tabled.length;
  if (!N) return;
  n = n || 100;
  p = p || 0;

  // determine range of contigs to show
  const start = n * p;
  const length = Math.min(n, N - start);
  if (length < 1) return;
  const end = start + length;

  // clear existing content
  const table = byId('data-table');
  if (!title) title = table.getAttribute('data-title');
  else table.setAttribute('data-title', title);

  const tbody = table.tBodies[0];
  tbody.innerHTML = '';

  // get columns to show
  const names = cols.names,
        types = cols.types;
  const m = names.length;

  // populate table
  let idx, j, row, type, cell;
  for (let i = start; i < end; i++) {
    idx = tabled[i];
    row = tbody.insertRow(-1);
    for (j = 0; j < m; j++) {
      type = types[j];
      if (type.endsWith('wt')) continue;
      cell = row.insertCell(-1);
      cell.innerHTML = value2Str(data[j][idx], type);
    }
  }

  const P = Math.ceil(N / n);
  table.setAttribute('data-nctg', n);
  table.setAttribute('data-ipage', p);
  table.setAttribute('data-npage', P);
  byId('data-title-span').innerHTML =
    `${title} (${start + 1} to ${end}) of ${N}`;
  const text = byId('data-page-txt');
  text.value = p + 1;
  text.title = `Page ${p + 1} of ${P}`;
  byId('data-prev-btn').disabled = (p === 0);
  byId('data-next-btn').disabled = (p === P - 1);
}


/**
 * Sort data table by one column.
 * @function sortDataTable
 * @param {Object} mo - main object
 * @param {number} idx - column index
 * @param {boolean} order - ascending (false) or descending (true)
 * @description It uses a trick to sort one array based on another array.
 * Only works with numeric columns. Won't work if there are NaN values.
 */
function sortDataTable(mo, idx, order) {
  const tabled = mo.tabled;
  const col = mo.data[idx];

  if (order) { // descending
    tabled.sort((a, b) => { return col[b] - col[a]; });
  } else { // ascending
    tabled.sort((a, b) => { return col[a] - col[b]; });
  }
}


/**
 * Export data table as a TSV file.
 * @function exportDataTable
 * @param {Object} mo - main object
 */
 function exportDataTable(mo) {
  if (!mo.cache.nctg) return;
  const data = mo.data,
        cols = mo.cols;
  const names = cols.names,
        types = cols.types;
  const m = names.length;
  let tsv = '';

  // get indices to export
  if (byId('data-table-modal').classList.contains(
    'hidden')) mo.tabled = [...data[0].keys()];
  const tabled = mo.tabled;
  const n = tabled.length;
  if (!n) return;

  // populate table header
  let row = [names[0]];
  let j;
  for (j = 1; j < m; j++) {
    if (types[j].endsWith('wt')) continue;
    row.push(`${names[j]}|${types[j].charAt(0)}`);
  }
  tsv += (row.join('\t') + '\n');

  // populate table body
  const ids = data[0];
  let idx, val, wt, nval, wts, k;
  for (let i = 0; i < n; i++) {
    idx = tabled[i];
    row = [ids[idx]];
    for (j = 1; j < m; j++) {
      val = data[j][idx];
      switch (types[j]) {

        case 'id':
        case 'des':
          row.push(val);
          break;

        case 'num':
          row.push(val === val ? String(val) : '')  // NaN becomes empty cell
          break;
        case 'cat':
          if (val && types[j + 1] === 'cwt') {
            wt = data[j + 1][idx];
            if (wt === wt) val += `:${wt}`;
          }
          row.push(val);
          break;

        case 'fea':
          nval = val.length;
          if (nval && types[j + 1] === 'fwt') {
            wts = data[j + 1][idx];
            for (k = 0; k < nval; k++) {
              wt = wts[k];
              if (wt === wt) val[k] += `:${wt}`;
            }
          }
          row.push(val.join(','));
          break;
      }
    }
    tsv += (row.join('\t') + '\n');
  }

  // create file for download
  const a = document.createElement('a');
  a.href = "data:text/tab-separated-values;charset=utf-8," +
    encodeURIComponent(tsv);
  a.download = 'data.tsv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


/**
 * Export data table as a JSON file (obsolete).
 * @function exportJSON
 * @param {Object} data - data object to export
 * @see {@link https://stackoverflow.com/questions/17527713/}
 * This way avoids saving the lengthy href.
 */
 function exportJSON(data) {
  const a = document.createElement('a');
  a.href = 'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(data, null, 2));
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
