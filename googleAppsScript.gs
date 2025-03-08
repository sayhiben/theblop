/***************************************************
 * Google Apps Script - Updated per your feedback
 ***************************************************/

/**
 * Properties assumed to be set via the Apps Script UI or API:
 * - INBOX_SPREADSHEET_ID
 * - PROCESSED_SPREADSHEET_ID
 * - DRIVE_FOLDER_ID
 * - RUNPOD_ENDPOINT_URL
 * - RUNPOD_API_KEY
 */
const scriptProperties = PropertiesService.getScriptProperties();
const INBOX_SPREADSHEET_ID = scriptProperties.getProperty('INBOX_SPREADSHEET_ID');
const PROCESSED_SPREADSHEET_ID = scriptProperties.getProperty('PROCESSED_SPREADSHEET_ID');
const DRIVE_FOLDER_ID = scriptProperties.getProperty('DRIVE_FOLDER_ID');
const RUNPOD_ENDPOINT_URL = scriptProperties.getProperty('RUNPOD_ENDPOINT_URL');
const RUNPOD_API_KEY = scriptProperties.getProperty('RUNPOD_API_KEY');

// Names of the sheets
const RAW_DATA_SHEET_NAME = 'RawData';
const PROCESSED_SHEET_NAME = 'Processed';
const JOBS_SHEET_NAME = 'Jobs';

// ---------------------------------------------------------------------
// Table Header Definitions
// ---------------------------------------------------------------------

/**
 * RawData columns (one row per email image):
 * 1) Date       (the entire date/time: e.g. "2025-03-15 14:30")
 * 2) UUID
 * 3) Subject
 * 4) Body
 * 5) Links
 * 6) Image URL
 * 7) Image Id
 * 8) Processed
 */
const RAW_DATA_HEADERS = [
  'Date',
  'UUID',
  'Subject',
  'Body',
  'Links',
  'Image URL',
  'Image Id',
  'Processed'
];

/**
 * Processed columns:
 * 1) UUID
 * 2) Received At       (copy of RawData.Date)
 * 3) Date             (parsed "event date" from AI, if any)
 * 4) Time             (parsed "event time" from AI, if any)
 * 5) Title
 * 6) Description
 * 7) City
 * 8) State
 * 9) Address
 * 10) Meeting Location
 * 11) Links
 * 12) Sponsors
 * 13) Image URL
 * 14) Image Source
 * 15) Extracted Text
 * 16) Canonical UUID
 */
const PROCESSED_DATA_HEADERS = [
  'UUID',
  'Received At',
  'Date',
  'Time',
  'Title',
  'Description',
  'City',
  'State',
  'Address',
  'Meeting Location',
  'Links',
  'Sponsors',
  'Image URL',
  'Image Source',
  'Extracted Text',
  'Canonical UUID'
];

/**
 * Jobs columns
 */
const JOBS_HEADERS = [
  'Timestamp',
  'JobID',
  'Status',
  'PollAttempts',
  'NextPollMins',
  'Submissions'
];

// For poll interval clamp
const INITIAL_POLL_INTERVAL = 5;
const MAX_POLL_INTERVAL = 25;

const STATE_MAP = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS",
  "Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA",
  "Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT",
  "Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM",
  "New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK",
  "Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY"
};

function normalizeState(extracted) {
  let st = extracted.state ? extracted.state.trim() : '';
  if (!st) return '';

  // If city includes "Washington DC" or variant => "DC"
  if (extracted.city) {
    const cityLower = extracted.city.toLowerCase();
    if (cityLower.includes('washington') && (cityLower.includes('dc') || cityLower.includes('d.c'))) {
      return 'DC';
    }
  }
  // If we have a known US state name => 2-letter
  if (STATE_MAP[st]) return STATE_MAP[st];

  // If outside US
  if (extracted.country && extracted.country.toUpperCase() !== 'USA') {
    let ccode = extracted.countryCode || 'INT';
    return ccode.slice(0,3).toUpperCase();
  }
  return st;
}

// ---------------------------------------------------------------------
// 1) Safe Setup
// ---------------------------------------------------------------------

function setupSheets() {
  const inboxSS = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const processedSS = SpreadsheetApp.openById(PROCESSED_SPREADSHEET_ID);

  ensureSheetHasHeaders(inboxSS, RAW_DATA_SHEET_NAME, RAW_DATA_HEADERS);
  ensureSheetHasHeaders(processedSS, PROCESSED_SHEET_NAME, PROCESSED_DATA_HEADERS);
  ensureSheetHasHeaders(inboxSS, JOBS_SHEET_NAME, JOBS_HEADERS);
}

/**
 * If a sheet doesn't exist, create it with the required headers.
 * If it does exist, verify columns match the required list or throw an error.
 */
function ensureSheetHasHeaders(ss, sheetName, requiredHeaders) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    Logger.log(`Created sheet "${sheetName}" with required headers.`);
    return;
  }

  const row1 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (let i = 0; i < requiredHeaders.length; i++) {
    if (row1[i] !== requiredHeaders[i]) {
      throw new Error(
        `Sheet "${sheetName}" mismatch at col ${i + 1}. ` +
        `Expected "${requiredHeaders[i]}", found "${row1[i]}".`
      );
    }
  }
  Logger.log(`Sheet "${sheetName}" is compatible.`);
}

// ---------------------------------------------------------------------
// 2) Memoized "header → column" & row appends
// ---------------------------------------------------------------------
const headerMapCache = {};

function getHeaderMap(sheet) {
  const sheetId = `${sheet.getParent().getId()}--${sheet.getSheetId()}`;
  if (headerMapCache[sheetId]) return headerMapCache[sheetId];

  const row1 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  row1.forEach((hdr, i) => { map[hdr] = i; });
  headerMapCache[sheetId] = map;
  return map;
}

function appendRowByHeaders(sheet, recordObj) {
  const hMap = getHeaderMap(sheet);
  const newRow = new Array(Object.keys(hMap).length).fill('');
  for (let key in recordObj) {
    if (hMap.hasOwnProperty(key)) {
      newRow[hMap[key]] = recordObj[key];
    }
  }
  sheet.appendRow(newRow);
}

// ---------------------------------------------------------------------
// 3) Utility: parse & coerce date/time to "recent" if older year
// ---------------------------------------------------------------------
function parseAndNormalizeDateTime(dtValue) {
  const dayjs = loadDayjs();
  let dt = dayjs(dtValue);
  if (!dt.isValid()) return ''; // fallback empty
  let currentYear = dayjs().year();
  if (dt.year() < currentYear) {
    dt = dt.year(currentYear);
  }
  return dt.format('YYYY-MM-DD HH:mm'); // store full datetime as "YYYY-MM-DD HH:mm"
}

function extractJsonFromText(text) {
  if (!text) return null;
  let start = text.indexOf('{');
  let end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  let snippet = text.substring(start, end + 1);
  try {
    return JSON.parse(snippet);
  } catch (e) {
    return null;
  }
}

function arrayOrString(val) {
  if (!val) return '';
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

// ---------------------------------------------------------------------
// 4) processEmails => RawData
// ---------------------------------------------------------------------
function processEmails() {
  Logger.log('Starting processEmails()...');
  const inboxSS = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const rawDataSheet = inboxSS.getSheetByName(RAW_DATA_SHEET_NAME);

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const threads = GmailApp.search('in:inbox is:unread has:attachment');
  Logger.log(`Found ${threads.length} unread thread(s).`);
  if (!threads.length) return;

  threads.forEach(thread => {
    const messages = thread.getMessages();
    Logger.log('Thread has ' + messages.length + ' message(s). Processing each unread message...');

    messages.forEach(msg => {
      if (!msg.isUnread()) return;
      Logger.log('Processing unread message with subject: ' + msg.getSubject());

      // We'll store the entire date/time in "Date" column
      let dateStr = parseAndNormalizeDateTime(msg.getDate());

      const subject = msg.getSubject();
      const bodyText = msg.getPlainBody();

      // Extract links
      const linkRegex = /https?:\/\/\S+/g;
      const links = bodyText.match(linkRegex) || [];

      const attachments = msg.getAttachments({ includeInlineImages: true });
      Logger.log('Found ' + attachments.length + ' attachment(s).');

      attachments.forEach(att => {
        if (!att.getContentType().match(/^image\//)) return;

        const uuid = Utilities.getUuid();

        // Re-encode as JPEG to remove metadata
        let originalName = att.getName() || 'attachment';
        let baseName = originalName.replace(/\.[^.]+$/, '');
        let newBlob = Utilities.newBlob(
          att.copyBlob().getBytes(),
          'image/jpeg',
          baseName + '.jpg'
        );
        const file = folder.createFile(newBlob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        const imageId = file.getId();
        const publicUrl = `https://drive.google.com/uc?export=view&id=${imageId}`;

        // Insert into RawData
        let record = {
          "Date": dateStr,    // includes full datetime
          "UUID": uuid,
          "Subject": subject,
          "Body": bodyText,
          "Links": links.join(', '),
          "Image URL": publicUrl,
          "Image Id": imageId,
          "Processed": 'false'
        };
        appendRowByHeaders(rawDataSheet, record);
        Logger.log('Stripped EXIF, saved file. ID: ' + imageId + ', URL: ' + publicUrl);
      });

      msg.markRead();
    });
    thread.moveToTrash();
  });

  Logger.log('Completed processEmails().');
}

// ---------------------------------------------------------------------
// 5) launchRunPodJobs / pollRunPodJobs => finalize => Processed
// ---------------------------------------------------------------------
function launchRunPodJobs() {
  Logger.log('Starting launchRunPodJobs()...');
  const inboxSS = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const rawDataSheet = inboxSS.getSheetByName(RAW_DATA_SHEET_NAME);

  // gather unprocessed
  const vals = rawDataSheet.getDataRange().getValues();
  const map = getHeaderMap(rawDataSheet);
  const processedCol = map["Processed"];
  const uuidCol = map["UUID"];
  const imageIdCol = map["Image Id"];

  const submissions = [];
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i];
    let procVal = row[processedCol].toString().toLowerCase();
    if (procVal === 'false') {
      let uuid = row[uuidCol];
      let imgIds = row[imageIdCol];
      if (!uuid || !imgIds) continue;
      let arr = imgIds.split(',').map(s => s.trim()).filter(Boolean);
      submissions.push({ submissionId: uuid, imageIds: arr });
    }
  }
  if (!submissions.length) {
    Logger.log('No unprocessed rows found.');
    return;
  }
  Logger.log(`Posting ${submissions.length} submitted images to RunPod`);

  const payload = { input: { submissions } };
  try {
    let resp = UrlFetchApp.fetch(RUNPOD_ENDPOINT_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + RUNPOD_API_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    let code = resp.getResponseCode();
    Logger.log('RunPod response code: ' + code);
    if (code !== 200 && code !== 201) {
      Logger.log('RunPod error: ' + resp.getContentText());
      return;
    }
    let respData = JSON.parse(resp.getContentText());
    let jobId = respData.id || respData.jobId || 'UNKNOWN_ID';
    Logger.log(`RunPod job created with ID: ${jobId}`);

    // record job
    const jobsSheet = inboxSS.getSheetByName(JOBS_SHEET_NAME);
    let jobRecord = {
      "Timestamp": new Date(),
      "JobID": jobId,
      "Status": "PENDING",
      "PollAttempts": 0,
      "NextPollMins": 5,
      "Submissions": JSON.stringify(submissions)
    };
    appendRowByHeaders(jobsSheet, jobRecord);

    // schedule poll
    createOneTimeTrigger('pollRunPodJobs', INITIAL_POLL_INTERVAL);

  } catch (e) {
    Logger.log('Error in launchRunPodJobs: ' + e);
  }
  Logger.log('Completed launchRunPodJobs().');
}

function pollRunPodJobs() {
  Logger.log('Starting pollRunPodJobs()...');
  removeTriggersForFunction('pollRunPodJobs');

  const inboxSS = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const jobsSheet = inboxSS.getSheetByName(JOBS_SHEET_NAME);
  const data = jobsSheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log('No jobs to poll.');
    return;
  }

  const hMap = getHeaderMap(jobsSheet);
  const tsCol = hMap["Timestamp"];
  const jobIdCol = hMap["JobID"];
  const statusCol = hMap["Status"];
  const pollCol = hMap["PollAttempts"];
  const nextCol = hMap["NextPollMins"];
  const subsCol = hMap["Submissions"];

  let now = new Date();
  let anyRunning = false;
  let earliest = null;

  for (let i = 1; i < data.length; i++) {
    const rowIndex = i + 1;
    const row = data[i];
    let status = String(row[statusCol]);
    if (status === 'COMPLETED' || status === 'FAILED') continue;

    let lastUpdate = row[tsCol];
    if (!(lastUpdate instanceof Date)) continue;

    let pollAtt = +row[pollCol];
    let nextPoll = +row[nextCol];
    let diffMins = (now - lastUpdate) / 60000;
    if (diffMins < nextPoll) {
      anyRunning = true;
      let remain = nextPoll - diffMins;
      if (!earliest || remain < earliest) earliest = remain;
      continue;
    }

    // poll now
    let jobId = row[jobIdCol];
    let pollRes = checkRunPodJobStatus(jobId);
    jobsSheet.getRange(rowIndex, tsCol + 1).setValue(new Date());

    if (!pollRes) {
      // transient error
      jobsSheet.getRange(rowIndex, statusCol + 1).setValue('RUNNING');
      pollAtt++;
      let newInt = getNewNextPollInterval(pollAtt, nextPoll);
      jobsSheet.getRange(rowIndex, pollCol + 1).setValue(pollAtt);
      jobsSheet.getRange(rowIndex, nextCol + 1).setValue(newInt);
      anyRunning = true;
      if (!earliest || newInt < earliest) earliest = newInt;
      continue;
    }

    if (pollRes.status === 'RUNNING') {
      jobsSheet.getRange(rowIndex, statusCol + 1).setValue('RUNNING');
      pollAtt++;
      let newInt = getNewNextPollInterval(pollAtt, nextPoll);
      jobsSheet.getRange(rowIndex, pollCol + 1).setValue(pollAtt);
      jobsSheet.getRange(rowIndex, nextCol + 1).setValue(newInt);

      anyRunning = true;
      if (!earliest || newInt < earliest) earliest = newInt;

    } else if (pollRes.status === 'COMPLETED') {
      jobsSheet.getRange(rowIndex, statusCol + 1).setValue('COMPLETED');
      finalizeJobResults(pollRes.data, row[subsCol]);

    } else if (pollRes.status === 'FAILED') {
      jobsSheet.getRange(rowIndex, statusCol + 1).setValue('FAILED');
      markSubmissionsAsFailed(row[subsCol]);
    }
  }

  if (anyRunning && earliest != null) {
    let waitMins = Math.ceil(earliest);
    if (waitMins < 1) waitMins = 1;
    Logger.log(`Job(s) still running. Will check again in ${waitMins} minutes`)
    createOneTimeTrigger('pollRunPodJobs', waitMins);
  }
  Logger.log('Completed pollRunPodJobs().');
}

function checkRunPodJobStatus(jobId) {
  Logger.log(`Polling job ${jobId}`)
  try {
    let url = RUNPOD_ENDPOINT_URL.replace("/run", "/status/") + jobId;
    let resp = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + RUNPOD_API_KEY },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) {
      Logger.log(`Error polling job ${jobId}: ` + resp.getContentText());
      return null;
    }
    let data = JSON.parse(resp.getContentText());
    let st = data.status || 'RUNNING';
    if (st === 'COMPLETED' && data.output) {
      Logger.log("Job completed")
      return { status: 'COMPLETED', data: data.output };
    } else if (st === 'FAILED') {
      Logger.error("Job failed")
      return { status: 'FAILED', data: null };
    }
    Logger.log("Job still running")
    return { status: 'RUNNING', data: null };
  } catch (e) {
    Logger.log(`Exception in checkRunPodJobStatus: ${jobId} => ` + e);
    return null;
  }
}

function getNewNextPollInterval(pollAttempts, prevVal) {
  let newVal = (pollAttempts === 1) ? 1 : (prevVal * 2);
  return (newVal > MAX_POLL_INTERVAL) ? MAX_POLL_INTERVAL : newVal;
}

function extractStartTime(datetimeStr) {
  if (!datetimeStr) return null;
  
  // Regex to capture a numeric time (with optional minutes and period)
  // or special keywords like noon/midnight (sunrise/sunset are also matched).
  const timePattern = /(?<time>(?:(?<hour>\d{1,2})(?::(?<minute>\d{2}))?\s*(?<period>am|pm)?)|(?<special>noon|midnight|sunrise|sunset))/ig;
  const matches = [...datetimeStr.matchAll(timePattern)];
  
  // If the regex doesn't match any time-like segment, return the original string.
  if (matches.length === 0) return datetimeStr;
  
  // Use the first match as the candidate for the event's starting time.
  const first = matches[0].groups;
  // Optionally capture a second time if provided.
  const second = matches.length > 1 ? matches[1].groups : null;
  
  // Special keywords conversion.
  if (first.special) {
    const lower = first.special.toLowerCase();
    if (lower === 'noon') return "12:00 PM";
    if (lower === 'midnight') return "12:00 AM";
    // For sunrise or sunset, simply return a capitalized version.
    return first.special.charAt(0).toUpperCase() + first.special.slice(1).toLowerCase();
  }
  
  // Parse the first time's components.
  let hour = first.hour;
  let minute = first.minute || "00";
  let period = first.period ? first.period.toLowerCase() : null;
  
  // If the first time is missing an AM/PM indicator but a second time is present with one,
  // infer the correct period based on the relative hours.
  if (!period && second && second.period) {
    const firstHour = parseInt(hour, 10);
    const secondHour = second.hour ? parseInt(second.hour, 10) : null;
    
    // For a time like "12", assume it’s noon (PM) since events occur during waking hours.
    if (firstHour === 12) {
      period = "pm";
    } else if (secondHour !== null) {
      // If the first hour is greater than or equal to the second hour,
      // assume the first time is in the AM (e.g. "11 - 2pm" → 11 AM);
      // otherwise, inherit the period from the second time.
      period = firstHour >= secondHour ? "am" : second.period.toLowerCase();
    } else {
      period = second.period.toLowerCase();
    }
  }
  
  // If still missing a period, default to AM (unless the hour is 12, which we assume means noon/PM).
  if (!period) {
    period = parseInt(hour, 10) === 12 ? "pm" : "am";
  }
  
  // Format and return the time in 12h format.
  return `${parseInt(hour, 10)}:${minute.padStart(2, '0')} ${period.toUpperCase()}`;
}

function parseEventDatetime(rawDate, rawTime) {
  const dayjs = loadDayjs();
  
  // Clean up date for parsing
  let dateStr = `${rawDate}`.trim().toLowerCase()

  // Clean up time for parsing
  let timeStr = `${rawTime}`.trim().toLowerCase()
  timeStr = extractStartTime(timeStr)

  // 1) Attempt parsing date/time together
  let dt = dayjs(`${dateStr}, ${timeStr}`);
  // Skip midnight; it's the default for time failures
  if (dt.isValid() && dt.get('hour') !== 0) {
    return {
      "date": dt.format("YYYY-MM-DD"),
      "time": dt.format("h:mm A")
    }
  }

  // 2) Try parsing date only, pass time through.
  const time = timeStr.length > 0 ? timeStr : 'See Flyer';
  const date = dayjs(dateStr)
  if (date.isValid()) {
    return {
      "date": date.format("YYYY-MM-DD"),
      "time": time,
    }
  }

  // Fallback: Pass both through
  return {
    "date": dateStr.length > 0 ? dateStr : 'See Flyer',
    "time": time
  }
}

// ---------------------------------------------------------------------
// finalizeJobResults => add rows to Processed
// ---------------------------------------------------------------------
function finalizeJobResults(jobData, submissionsStr) {
  const dayjs = loadDayjs();

  if (!jobData || !submissionsStr) return;
  Logger.log(`finalizeJobResults() with ${jobData.length} item(s).`);

  const procSS = SpreadsheetApp.openById(PROCESSED_SPREADSHEET_ID);
  const procSheet = procSS.getSheetByName(PROCESSED_SHEET_NAME);

  const inboxSS = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const rawDataSheet = inboxSS.getSheetByName(RAW_DATA_SHEET_NAME);
  const rdMap = getHeaderMap(rawDataSheet);

  const dateCol = rdMap["Date"];
  const uuidCol = rdMap["UUID"];
  const procCol = rdMap["Processed"];

  let rawVals = rawDataSheet.getDataRange().getValues();
  let rowMap = {};
  for (let i = 1; i < rawVals.length; i++) {
    let rid = rawVals[i][uuidCol];
    rowMap[String(rid)] = i + 1; // row index
  }

  let subs;
  try { subs = JSON.parse(submissionsStr); }
  catch (e) {
    Logger.log('Cannot parse submissionsStr: ' + e);
    return;
  }

  jobData.forEach(item => {
    let subId = item.submissionId;
    let rowIdx = rowMap[subId];
    if (!rowIdx) {
      Logger.log(`No matching RawData row for subId=${subId}.`);
      return;
    }
    // Mark raw row as processed
    rawDataSheet.getRange(rowIdx, procCol + 1).setValue('true');

    // parse AI answer
    let extracted = extractJsonFromText(item.answer || '');
    if (!extracted) {
      Logger.log(`JSON parse fail for subId=${subId}. Mark row failed.`);
      markRowFailed(rawDataSheet, rowIdx);
      return;
    }

    // In the final sheet, we store the RawData.Date as "Received At"
    let receivedAt = rawVals[rowIdx - 1][dateCol] || '';

    Logger.log(extracted)
    const parsedDt = parseEventDatetime(extracted.date, extracted.time);
    Logger.log(`Parsed Date: ${parsedDt.date}, Parsed Time: ${parsedDt.time}`)

    let record = {
      "UUID": subId,
      "Received At": receivedAt,  // from RawData
      "Date": parsedDt.date,            // event date
      "Time": parsedDt.time,            // event time
      "Title": extracted.title || '',
      "Description": extracted.description || '',
      "City": extracted.city || '',
      "State": normalizeState(extracted),
      "Address": extracted.address || '',
      "Meeting Location": extracted.meeting_location || '',
      "Links": arrayOrString(extracted.links),
      "Sponsors": arrayOrString(extracted.sponsors),
      "Image URL": '',     // We'll fill from raw data if needed
      "Image Source": extracted.source || '',
      "Extracted Text": extracted.extracted_text || '',
      "Canonical UUID": '' // blank by default
    };
    Logger.log(record)

    const imageUrlCol = rdMap["Image URL"];
    if (imageUrlCol != null) {
      let rawImageUrl = rawDataSheet.getRange(rowIdx, imageUrlCol + 1).getValue() || '';
      record["Image URL"] = rawImageUrl;
    }

    appendRowByHeaders(procSheet, record);
    Logger.log(`Appended result for subId=${subId} to Processed.`);
  });
  Logger.log('finalizeJobResults() done.');
}

// markRowFailed
function markRowFailed(sheet, rowIndex) {
  if (rowIndex < 2) return;
  const map = getHeaderMap(sheet);
  let pCol = map["Processed"];
  sheet.getRange(rowIndex, pCol + 1).setValue('failed');
}

// markSubmissionsAsFailed
function markSubmissionsAsFailed(submissionsStr) {
  if (!submissionsStr) return;
  let subs;
  try { subs = JSON.parse(submissionsStr); }
  catch (e) {
    Logger.log('Error in markSubmissionsAsFailed: ' + e);
    return;
  }

  const inboxSS = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const rawDataSheet = inboxSS.getSheetByName(RAW_DATA_SHEET_NAME);
  const vals = rawDataSheet.getDataRange().getValues();
  const map = getHeaderMap(rawDataSheet);
  let uCol = map["UUID"], pCol = map["Processed"];
  let rowMap = {};
  for (let i = 1; i < vals.length; i++) {
    rowMap[String(vals[i][uCol])] = i + 1;
  }

  subs.forEach(s => {
    let rowIdx = rowMap[s.submissionId];
    if (rowIdx > 1) {
      rawDataSheet.getRange(rowIdx, pCol + 1).setValue('failed');
    }
  });
}

// Triggers
function createOneTimeTrigger(fnName, minsFromNow) {
  ScriptApp.newTrigger(fnName)
    .timeBased()
    .after(minsFromNow * 60 * 1000)
    .create();
}

function removeTriggersForFunction(fnName) {
  ScriptApp.getProjectTriggers().forEach(tr => {
    if (tr.getHandlerFunction() === fnName) {
      ScriptApp.deleteTrigger(tr);
    }
  });
}

/**
 * Example cleanup: permanently remove threads in Trash older_than:2d
 */
function cleanTrash() {
  const threads = GmailApp.search('in:trash older_than:2d');
  threads.forEach(thread => {
    try {
      Gmail.Users.Threads.remove('me', thread.getId());
    } catch (e) {
      Logger.log('Error removing thread ' + thread.getId() + ': ' + e);
    }
  });
}
