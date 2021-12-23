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
  byId('load-data-btn').addEventListener('click', function () {
    byId('open-file').click();
  });
}


/**
 * Initiate data table based on data.
 * @function buildDataTable
 */
function buildDataTable(columns, types) {
  const table = byId('data-table');
  table.innerHTML = '';
  const header = table.createTHead();
  const row = header.insertRow(-1);
  const n = columns.length;
  let cell;
  for (let i = 0; i < n; i++) {
    cell = row.insertCell(-1);
    cell.setAttribute('data-index', i);
    cell.setAttribute('data-column', columns[i]);
    cell.setAttribute('data-type', types[i]);
    cell.innerHTML = columns[i];
  }
  table.appendChild(document.createElement('tbody'));
}


/**
 * Populate data table by data.
 * @function fillDataTable
 * @param {Object} data - data object
 * @param {number} [n=100] - maximum number of rows
 */
function fillDataTable(data, n) {
  n = n || 100;
  const df = data.df,
        cols = data.cols,
        types = data.types;
  const m = cols.length;
  const table = byId('data-table');
  table.tBodies[0].innerHTML = '';
  let i, j, row, cell;
  for (i = 0; i < n; i++) {
    row = table.tBodies[0].insertRow(-1);
    for (j = 0; j < m; j++) {
      cell = row.insertCell(-1);
      cell.innerHTML = value2Str(df[i][j], types[j]);
    }
  }
}
