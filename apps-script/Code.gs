/**
 * Typeform → Google Sheet → PDF service bridge
 *
 * Script Properties (Project settings → Script properties):
 *   WEBHOOK_URL    — e.g. https://your-app.onrender.com/webhooks/sheet-row
 *   WEBHOOK_SECRET — same value as server WEBHOOK_SECRET
 *   SHEET_NAME     — optional, e.g. Form Responses 1 (if not the active tab)
 *
 * Run setupTriggers() once after pasting this file.
 */

var PROP_LAST_ROW = 'lastProcessedRow';

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('WEBHOOK_URL');
  var secret = props.getProperty('WEBHOOK_SECRET');
  if (!url || !secret) {
    throw new Error(
      'Set WEBHOOK_URL and WEBHOOK_SECRET in Script Properties (Project settings).'
    );
  }
  return { url: url, secret: secret };
}

function getActiveDataSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = PropertiesService.getScriptProperties().getProperty('SHEET_NAME');
  if (sheetName) {
    var named = ss.getSheetByName(sheetName);
    if (named) {
      return named;
    }
    throw new Error('Sheet not found: ' + sheetName);
  }
  var sheet = ss.getActiveSheet();
  if (!sheet) {
    throw new Error('No active sheet found.');
  }
  return sheet;
}

function rowToFields_(headers, rowValues) {
  var fields = {};
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    if (key === null || key === undefined || String(key).trim() === '') {
      continue;
    }
    fields[String(key)] = rowValues[i] === undefined ? '' : rowValues[i];
  }
  return fields;
}

function findToken_(headers, rowValues) {
  var tokenHeaders = ['token', 'response token', 'response_id', 'response id'];
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').toLowerCase().trim();
    if (tokenHeaders.indexOf(h) !== -1) {
      return rowValues[i] ? String(rowValues[i]) : '';
    }
  }
  return '';
}

function findSubmittedAt_(headers, rowValues) {
  var dateHeaders = ['submitted at', 'submitted_at', 'timestamp', 'date'];
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').toLowerCase().trim();
    if (dateHeaders.indexOf(h) !== -1) {
      var val = rowValues[i];
      if (val instanceof Date) {
        return val.toISOString();
      }
      return val ? String(val) : '';
    }
  }
  return '';
}

function sendRowToPdfService_(payload, config) {
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Webhook-Secret': config.secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(config.url, options);
  var code = response.getResponseCode();
  var body = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('PDF service returned ' + code + ': ' + body);
  }
}

/**
 * Process all new rows since last run. Safe to call from triggers or manually.
 */
function processNewRows() {
  var sheet = getActiveDataSheet_();
  var config = getConfig_();
  var props = PropertiesService.getScriptProperties();

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    return;
  }

  var lastProcessed = parseInt(props.getProperty(PROP_LAST_ROW) || '1', 10);
  if (isNaN(lastProcessed) || lastProcessed < 1) {
    lastProcessed = 1;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  for (var r = lastProcessed + 1; r <= lastRow; r++) {
    var rowValues = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
    var fields = rowToFields_(headers, rowValues);

    var payload = {
      source: 'google_sheet',
      spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
      sheetName: sheet.getName(),
      rowNumber: r,
      submittedAt: findSubmittedAt_(headers, rowValues) || new Date().toISOString(),
      responseToken: findToken_(headers, rowValues),
      fields: fields,
    };

    sendRowToPdfService_(payload, config);
    props.setProperty(PROP_LAST_ROW, String(r));
  }
}

/**
 * Installable onChange trigger target.
 */
function onSheetChange(e) {
  if (!e || !e.changeType) {
    processNewRows();
    return;
  }
  var relevant = [
    'INSERT_ROW',
    'INSERT_GRID',
    'EDIT',
    'OTHER',
  ];
  if (relevant.indexOf(e.changeType) !== -1) {
    processNewRows();
  }
}

/**
 * Time-driven backup (every 5 minutes). Run once via setupTriggers().
 */
function pollNewRows() {
  processNewRows();
}

/**
 * Run this once from the Apps Script editor to create triggers.
 */
function setupTriggers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === 'onSheetChange' || fn === 'pollNewRows') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('onSheetChange')
    .forSpreadsheet(ss)
    .onChange()
    .create();

  ScriptApp.newTrigger('pollNewRows')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Triggers created: onChange + 5-minute poll.');
}

/**
 * Test without waiting for a new Typeform response.
 * Processes the next unprocessed row only if you have data; otherwise logs a hint.
 */
function testProcessNewRows() {
  processNewRows();
}
