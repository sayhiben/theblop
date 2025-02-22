/***************************************************
 * Google Apps Script - Main Code with Verbose Logging
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

// Names of the sheets (tabs)
const RAW_DATA_SHEET_NAME = 'RawData';
const PROCESSED_SHEET_NAME = 'Processed';
const JOBS_SHEET_NAME = 'Jobs';

/**
 * Check if a given uuid already exists in either the RawData or Processed sheets.
 * We skip adding if it exists, preventing duplicates.
 */
function uuidExistsInSheets(uuid) {
  if (!uuid) return true; // safety
  const rawSs = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const rawSheet = rawSs.getSheetByName(RAW_DATA_SHEET_NAME);
  const processedSs = SpreadsheetApp.openById(PROCESSED_SPREADSHEET_ID);
  const procSheet = processedSs.getSheetByName(PROCESSED_SHEET_NAME);

  const rawValues = rawSheet.getDataRange().getValues();
  const procValues = procSheet.getDataRange().getValues();

  // In RawData: row format is [Date, UUID, Subject, Body, Links, ImageURLs, ImageIds, Processed]
  // so UUID is at index 1
  for (let i = 1; i < rawValues.length; i++) {
    if (String(rawValues[i][1]) === String(uuid)) {
      return true;
    }
  }

  // In Processed: row format is [UUID, Date, Time, Title, ...]
  // so UUID is at index 0
  for (let j = 1; j < procValues.length; j++) {
    if (String(procValues[j][0]) === String(uuid)) {
      return true;
    }
  }

  return false;
}

// -----------------------------------------------------------------------------
// 1. processEmails()
//    Processes unread messages, stores them in 'RawData', marks as read,
//    and moves the thread to Trash afterward.
// -----------------------------------------------------------------------------

function processEmails() {
  Logger.log('Starting processEmails()...');
  
  Logger.log('INBOX_SPREADSHEET_ID: ' + INBOX_SPREADSHEET_ID);
  Logger.log('DRIVE_FOLDER_ID: ' + DRIVE_FOLDER_ID);

  const sheet = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID).getSheetByName(RAW_DATA_SHEET_NAME);
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  // Search only unread messages with attachments
  const threads = GmailApp.search('in:inbox is:unread has:attachment');
  Logger.log('Found ' + threads.length + ' unread thread(s).');

  if (!threads.length) {
    Logger.log('No unread threads. Exiting processEmails().');
    return;
  }

  threads.forEach(thread => {
    const messages = thread.getMessages();
    Logger.log('Thread has ' + messages.length + ' message(s). Processing each unread message...');

    messages.forEach(message => {
      if (message.isUnread()) {
        Logger.log('Processing unread message with subject: ' + message.getSubject());

        const date = message.getDate();
        const uuid = Utilities.getUuid();
        const subject = message.getSubject();
        const bodyText = message.getPlainBody();

        // Check for duplicates by this uuid. If it exists, skip.
        if (uuidExistsInSheets(uuid)) {
          Logger.log('UUID already present. Skipping...');
          message.markRead();
          thread.moveToTrash();
          return;
        }

        // Extract any links from the email body
        const linkRegex = /https?:\/\/\S+/g;
        const links = bodyText.match(linkRegex) || [];
        Logger.log('Extracted ' + links.length + ' link(s) from email body.');

        // Get attachments
        const attachments = message.getAttachments({includeInlineImages: false});
        Logger.log('Found ' + attachments.length + ' attachment(s).');

        const images = [];
        attachments.forEach(att => {
          if (att.getContentType().match(/^image\//)) {
            // 1) Copy the original image blob
            const originalBlob = att.copyBlob();

            // 2) Re-encode as PNG to remove EXIF/metadata from original (often JPEG)
            const strippedBlob = Utilities.newBlob(
              originalBlob.getBytes(),
              'image/png',             // force PNG
              'stripped_' + att.getName() // rename as desired
            );

            // 3) Create the new file in Drive
            const file = folder.createFile(strippedBlob);

            // Make the file public
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

            // 4) Build a shareable URL for embedding
            const imageId = file.getId();
            const publicUrl = "https://drive.google.com/uc?export=view&id=" + imageId;

            images.push({ id: imageId, url: publicUrl });
            Logger.log('Stripped EXIF, saved file. ID: ' + imageId + ', URL: ' + publicUrl);
          }
        });

        // Prepare CSV fields for RawData
        const imageUrls = images.map(img => img.url);
        const imageIds = images.map(img => img.id);

        Logger.log('Appending row to RawData with UUID: ' + uuid);
        sheet.appendRow([
          date,
          uuid,
          subject,
          bodyText,
          links.join(', '),
          imageUrls.join(', '), // col 5 in 0-based => col 6 in the spreadsheet
          imageIds.join(', '),  // col 6 => col 7
          'false'               // col 7 => col 8
        ]);

        // Mark message as read
        message.markRead();
        Logger.log('Marked message as read, subject: ' + subject);
      }
    });

    // Move the entire thread to trash
    thread.moveToTrash();
    Logger.log('Moved thread to trash.');
  });

  Logger.log('Completed processEmails().');
}

// -----------------------------------------------------------------------------
// 2. launchRunPodJobs()
//    Finds unprocessed submissions in RawData, starts a RunPod job, logs it in
//    Jobs sheet, and schedules the FIRST run of pollRunPodJobs() (in 5 minutes).
// -----------------------------------------------------------------------------

function launchRunPodJobs() {
  Logger.log('Starting launchRunPodJobs()...');
  
  Logger.log('INBOX_SPREADSHEET_ID: ' + INBOX_SPREADSHEET_ID);
  Logger.log('RUNPOD_ENDPOINT_URL: ' + RUNPOD_ENDPOINT_URL);

  const ss = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const rawDataSheet = ss.getSheetByName(RAW_DATA_SHEET_NAME);

  // Gather unprocessed rows
  const data = rawDataSheet.getDataRange().getValues();
  Logger.log('RawData sheet contains ' + data.length + ' row(s) (including header).');

  const submissions = [];
  // data[0] = header row: [Date, UUID, Subject, Body, Links, ImageURLs, ImageIds, Processed]
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const processedFlag = String(row[7]).toLowerCase(); // 'false' or 'true' or 'failed'
    if (processedFlag === 'false') {
      const uuid = row[1];
      const imageIdsStr = row[6];
      if (!uuid || !imageIdsStr) continue;
      const idArray = imageIdsStr.split(',').map(s => s.trim()).filter(Boolean);
      submissions.push({ submissionId: uuid, imageIds: idArray });
    }
  }

  if (!submissions.length) {
    Logger.log('No unprocessed submissions found. Exiting launchRunPodJobs().');
    return;
  }

  Logger.log('Submitting ' + submissions.length + ' unprocessed submission(s) to RunPod.');

  const payload = { "input": { "submissions": submissions } };
  try {
    const response = UrlFetchApp.fetch(RUNPOD_ENDPOINT_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + RUNPOD_API_KEY
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    Logger.log('Received response code: ' + response.getResponseCode());

    if (response.getResponseCode() !== 200 && response.getResponseCode() !== 201) {
      Logger.log('RunPod submission failed. Code: ' + response.getResponseCode() + ', body: ' + response.getContentText());
      return;
    }

    const respData = JSON.parse(response.getContentText());
    const jobId = respData.id || respData.jobId || 'UNKNOWN_ID';
    Logger.log('RunPod job created with ID: ' + jobId);

    // Record the job in the "Jobs" sheet
    const jobsSheet = getOrCreateJobsSheet(ss);
    // Columns: [ Timestamp, JobID, Status, PollAttempts, NextPollMins, Submissions ]
    jobsSheet.appendRow([
      new Date(),            // Timestamp
      jobId,                 // Job ID
      'PENDING',             // Status
      0,                     // PollAttempts
      5,                     // NextPollMins (start with 5 minutes)
      JSON.stringify(submissions)
    ]);

    // Now schedule a run of pollRunPodJobs() in 5 minutes
    Logger.log('Creating time-based trigger for pollRunPodJobs() in 5 minutes.');
    createOneTimeTrigger('pollRunPodJobs', 5);

  } catch (err) {
    Logger.log('Error creating RunPod job: ' + err);
  }

  Logger.log('Completed launchRunPodJobs().');
}

// -----------------------------------------------------------------------------
// 3. pollRunPodJobs()
//    Runs once, checks all incomplete jobs. Polls them if their nextPollMins
//    has elapsed, updates status. If any jobs still not done, schedules
//    itself again with the earliest nextPollMins. Then it exits.
// -----------------------------------------------------------------------------

function pollRunPodJobs() {
  Logger.log('Starting pollRunPodJobs()...');
  
  // 1. Remove any existing triggers for pollRunPodJobs (to prevent duplicates).
  removeTriggersForFunction('pollRunPodJobs');
  Logger.log('Removed any existing triggers for pollRunPodJobs().');

  // 2. Perform the poll logic
  const ss = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const jobsSheet = getOrCreateJobsSheet(ss);

  const data = jobsSheet.getDataRange().getValues();
  Logger.log('Jobs sheet contains ' + data.length + ' row(s) (including header).');

  if (data.length <= 1) {
    Logger.log('No job records found. Exiting pollRunPodJobs().');
    return;
  }

  let anyStillRunning = false;
  let earliestNextPoll = null;
  const now = new Date();

  // Identify columns by index:
  // 0=Timestamp, 1=JobID, 2=Status, 3=PollAttempts, 4=NextPollMins, 5=Submissions
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowIndex = i + 1; // 1-based in the sheet

    let lastUpdateTime = row[0]; // Date
    let jobId = row[1];
    let status = row[2];
    let pollAttempts = row[3];
    let nextPollMins = row[4];
    let submissionsStr = row[5];

    if (typeof status !== 'string') {
      status = String(status);
    }

    // If job is already COMPLETED or FAILED, skip
    if (status === 'COMPLETED' || status === 'FAILED') {
      continue;
    }

    if (!(lastUpdateTime instanceof Date)) {
      // If there's no valid timestamp, skip or fix
      Logger.log('Warning: Last update time for job ' + jobId + ' is invalid. Skipping poll for this job.');
      continue;
    }

    let diffMs = now - lastUpdateTime; // in ms
    let diffMins = diffMs / 1000 / 60;
    Logger.log('Job ' + jobId + ' last polled ' + diffMins.toFixed(2) +
      ' minute(s) ago; next poll is in ' + nextPollMins + ' minute(s).');

    // Check if enough time has passed to poll again
    if (diffMins < nextPollMins) {
      anyStillRunning = true;
      let timeUntilNextPoll = nextPollMins - diffMins;
      Logger.log('Not enough time elapsed for job ' + jobId +
        '. Will poll again in ~' + timeUntilNextPoll.toFixed(2) + ' minute(s).');
      if (earliestNextPoll == null || timeUntilNextPoll < earliestNextPoll) {
        earliestNextPoll = timeUntilNextPoll;
      }
      continue;
    }

    // Time to poll RunPod job
    Logger.log('Polling RunPod for job ' + jobId + '...');
    const pollResult = checkRunPodJobStatus(jobId);

    // Update timestamp to "now"
    jobsSheet.getRange(rowIndex, 1).setValue(new Date());

    if (!pollResult) {
      Logger.log('checkRunPodJobStatus() returned null for job ' + jobId +
        '. Possibly a transient error.');
      pollAttempts++;
      let newNextPoll = getNewNextPollInterval(pollAttempts, nextPollMins);

      jobsSheet.getRange(rowIndex, 4).setValue(pollAttempts); // PollAttempts
      jobsSheet.getRange(rowIndex, 5).setValue(newNextPoll);  // NextPollMins
      jobsSheet.getRange(rowIndex, 3).setValue('RUNNING');    // Status

      anyStillRunning = true;
      if (earliestNextPoll == null || newNextPoll < earliestNextPoll) {
        earliestNextPoll = newNextPoll;
      }
      continue;
    }

    // pollResult is { status: 'RUNNING'|'COMPLETED'|'FAILED', data: array or null }
    if (pollResult.status === 'RUNNING') {
      pollAttempts++;
      let newNextPoll = getNewNextPollInterval(pollAttempts, nextPollMins);

      jobsSheet.getRange(rowIndex, 3).setValue('RUNNING');    // Status
      jobsSheet.getRange(rowIndex, 4).setValue(pollAttempts); // PollAttempts
      jobsSheet.getRange(rowIndex, 5).setValue(newNextPoll);  // NextPollMins

      anyStillRunning = true;
      if (earliestNextPoll == null || newNextPoll < earliestNextPoll) {
        earliestNextPoll = newNextPoll;
      }

    } else if (pollResult.status === 'COMPLETED') {
      Logger.log('Job ' + jobId + ' completed successfully.');
      jobsSheet.getRange(rowIndex, 3).setValue('COMPLETED'); // Status
      finalizeJobResults(pollResult.data, submissionsStr);

    } else if (pollResult.status === 'FAILED') {
      Logger.log('Job ' + jobId + ' reported FAILED status.');
      jobsSheet.getRange(rowIndex, 3).setValue('FAILED'); // Status
      markSubmissionsAsFailed(submissionsStr);
    }
  }

  // 3. If any jobs are still pending, schedule a new run
  if (anyStillRunning && earliestNextPoll != null) {
    let waitMins = Math.ceil(earliestNextPoll);
    if (waitMins < 1) {
      waitMins = 1; // ensure at least 1 minute
    }
    Logger.log('Scheduling next pollRunPodJobs() in ' + waitMins + ' minute(s).');
    createOneTimeTrigger('pollRunPodJobs', waitMins);
  } else {
    Logger.log('No further polling needed at this time.');
  }

  Logger.log('Completed pollRunPodJobs().');
}

/**
 * Creates a one-time time-based trigger for a function to run in "minutesFromNow" minutes.
 */
function createOneTimeTrigger(functionName, minutesFromNow) {
  Logger.log('Creating one-time trigger for ' + functionName +
    ' to run in ' + minutesFromNow + ' minute(s).');
  return ScriptApp.newTrigger(functionName)
    .timeBased()
    .after(minutesFromNow * 60 * 1000)
    .create();
}

/**
 * Removes all triggers for a specific function name
 */
function removeTriggersForFunction(functionName) {
  Logger.log('Removing triggers for function: ' + functionName);
  const allTriggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(allTriggers[i]);
      Logger.log('Deleted existing trigger for function: ' + functionName);
    }
  }
}

/**
 * Queries RunPod job status.
 * Return object: { status: 'RUNNING'|'COMPLETED'|'FAILED', data: array or null }
 */
function checkRunPodJobStatus(jobId) {
  Logger.log('Calling RunPod status API for jobId: ' + jobId);
  try {
    let url = RUNPOD_ENDPOINT_URL.replace("/run", "/status/") + jobId;
    Logger.log('Checking status at ' + url + " ...");
    let response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + RUNPOD_API_KEY },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('Error checking job status (code ' + response.getResponseCode() +
        '): ' + response.getContentText());
      return null;
    }

    let data = JSON.parse(response.getContentText());
    let jobStatus = data.status || 'RUNNING';

    Logger.log('Response from RunPod status API for job ' + jobId + ': ' + JSON.stringify(data));

    if (jobStatus === 'COMPLETED' && data.output) {
      return { status: 'COMPLETED', data: data.output };
    } else if (jobStatus === 'FAILED') {
      return { status: 'FAILED', data: null };
    } else {
      return { status: 'RUNNING', data: null };
    }
  } catch (err) {
    Logger.log('Exception in checkRunPodJobStatus for job ' + jobId + ': ' + err);
    return null;
  }
}

/**
 * Exponential backoff for NextPollMins.
 * - pollAttempts=1 => 1 min
 * - pollAttempts=2 => 2 min
 * - pollAttempts=3 => 4 min
 * - pollAttempts=4 => 8 min
 * - clamp at 10
 */
function getNewNextPollInterval(pollAttempts, prevInterval) {
  Logger.log('Calculating new next poll interval with pollAttempts=' +
    pollAttempts + ', prevInterval=' + prevInterval);
  let newInterval;
  if (pollAttempts === 1) {
    newInterval = 1;
  } else {
    newInterval = prevInterval * 2;
  }
  if (newInterval > 10) {
    newInterval = 10;
  }
  Logger.log('New next poll interval: ' + newInterval + ' minute(s).');
  return newInterval;
}

/**
 * After a job completes, write results to "Processed" (if JSON parse is successful),
 * and mark the original row in RawData as processed.
 * jobData is array: [ { submissionId, answer }, ... ]
 * submissionsStr is the JSON of [{ submissionId, imageIds }, ...]
 */
function finalizeJobResults(jobData, submissionsStr) {
  Logger.log('finalizeJobResults() called.');
  
  // Open the processed spreadsheet
  const processedSS = SpreadsheetApp.openById(PROCESSED_SPREADSHEET_ID);
  const processedSheet = processedSS.getSheetByName(PROCESSED_SHEET_NAME);
  
  // Open the inbox (RawData) spreadsheet
  const inboxSS = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const rawDataSheet = inboxSS.getSheetByName(RAW_DATA_SHEET_NAME);

  let submissions;
  try {
    submissions = JSON.parse(submissionsStr);
    Logger.log('Parsed submissions from job: ' + JSON.stringify(submissions));
  } catch (e) {
    Logger.log('Error parsing job submission list: ' + e);
    return;
  }

  // Build a map from submissionId => row index in RawData
  const rawValues = rawDataSheet.getDataRange().getValues();
  let uuidCol = 1;      // "UUID"
  let processedCol = 7; // "Processed"
  let uuidToRowIndex = {};
  for (let r = 1; r < rawValues.length; r++) {
    let rid = rawValues[r][uuidCol];
    uuidToRowIndex[rid] = r + 1; // 1-based row
  }

  // For each AI result
  jobData.forEach(item => {
    let subId = item.submissionId;
    let rawAnswer = item.answer;

    // Extract JSON object from rawAnswer
    const extracted = extractJsonFromText(rawAnswer);
    if (!extracted) {
      Logger.log('Could not parse JSON for submission: ' + subId + '; marking row failed.');
      let rowIndexFail = uuidToRowIndex[subId];
      if (rowIndexFail) markRowFailed(rawDataSheet, rowIndexFail);
      return;
    }

    let rowIndex = uuidToRowIndex[subId];
    if (!rowIndex) {
      Logger.log('No matching RawData row found for submission ' + subId);
      return;
    }

    // Mark rawData as processed
    rawDataSheet.getRange(rowIndex, processedCol + 1).setValue('true');

    // Also ensure we do not insert duplicates in Processed.
    const existingProcValues = processedSheet.getDataRange().getValues();
    let existingUUIDs = existingProcValues.slice(1).map(row => String(row[0])); // col 0 is UUID
    if (existingUUIDs.includes(String(subId))) {
      Logger.log('Submission ' + subId + ' already in Processed. Skipping...');
      return;
    }

    // The processed sheet columns are:
    // 0=UUID, 1=Date, 2=Time, 3=Title, 4=Description, 5=City,
    // 6=State, 7=Address, 8=Meeting Location, 9=Links, 10=Sponsors,
    // 11=Image, 12=Source, 13=Extracted Text

    // Re-initialize for each submission (avoid data bleed)
    let rowVals = Array(14).fill('');
    rowVals[0]  = subId;
    rowVals[1]  = extracted.date || '';
    rowVals[2]  = extracted.time || '';
    rowVals[3]  = extracted.title || '';
    rowVals[4]  = extracted.description || '';
    rowVals[5]  = extracted.city || '';
    rowVals[6]  = extracted.state || '';
    rowVals[7]  = extracted.address || '';
    rowVals[8]  = extracted.meeting_location || '';

    // Convert arrays for links/sponsors to CSV if needed
    if (Array.isArray(extracted.links)) {
      rowVals[9] = extracted.links.join(', ');
    } else {
      rowVals[9] = extracted.links || '';
    }
    if (Array.isArray(extracted.sponsors)) {
      rowVals[10] = extracted.sponsors.join(', ');
    } else {
      rowVals[10] = extracted.sponsors || '';
    }

    // [UPDATED] Use the public image URL from column 6 in RawData (1-based).
    // That is "Image URLs" from processEmails().
    let rawImageUrlCsv = rawDataSheet.getRange(rowIndex, 6).getValue(); // col 6 = "Image URLs"
    let newCellImage = null;
    if (rawImageUrlCsv) {
      let firstUrl = rawImageUrlCsv.split(',').map(s => s.trim())[0];
      if (firstUrl) {
        rowVals[11] = `=HYPERLINK("${firstUrl}", image("${firstUrl}"))`;
      }
    }

    rowVals[12] = extracted.source || '';
    rowVals[13] = extracted.extracted_text || '';

    // Append the row (the image cell is temporarily placeholder)
    processedSheet.appendRow(rowVals);
    const appendedRow = processedSheet.getLastRow();

    // If there's an actual image, set it in the cell
    if (newCellImage) {
      processedSheet.getRange(appendedRow, 12).setValue(newCellImage);
      // 1-based col=12 => 'L' => rowVals[11]
    }

    Logger.log('Appended processed data for submission ' + subId + ' into Processed sheet.');
  });

  Logger.log('finalizeJobResults() completed.');
}

/**
 * Mark a single row in RawData as failed.
 */
function markRowFailed(sheet, rowIndex) {
  if (!rowIndex || rowIndex < 2) {
    Logger.log('Invalid or header rowIndex (' + rowIndex + ') for markRowFailed(). Skipping...');
    return;
  }
  Logger.log('Marking row ' + rowIndex + ' as failed in RawData sheet.');
  sheet.getRange(rowIndex, 8).setValue('failed');
}

/**
 * Mark entire job's submissions as failed
 */
function markSubmissionsAsFailed(submissionsStr) {
  Logger.log('markSubmissionsAsFailed() called.');
  
  const inboxSS = SpreadsheetApp.openById(INBOX_SPREADSHEET_ID);
  const rawDataSheet = inboxSS.getSheetByName(RAW_DATA_SHEET_NAME);

  let submissions;
  try {
    submissions = JSON.parse(submissionsStr);
  } catch (e) {
    Logger.log('Could not parse submissionsStr in markSubmissionsAsFailed: ' + e);
    return;
  }

  Logger.log('Marking ' + submissions.length + ' submission(s) as failed.');

  // Map from UUID => row
  const rawValues = rawDataSheet.getDataRange().getValues();
  let uuidCol = 1;
  let uuidToRowIndex = {};
  for (let r = 1; r < rawValues.length; r++) {
    let uuid = rawValues[r][uuidCol];
    uuidToRowIndex[uuid] = r + 1;
  }

  submissions.forEach(sub => {
    let rowIndex = uuidToRowIndex[sub.submissionId];
    markRowFailed(rawDataSheet, rowIndex);
  });

  Logger.log('Completed markSubmissionsAsFailed().');
}

/**
 * Extract JSON from a string that might contain extra text around it.
 */
function extractJsonFromText(text) {
  if (!text) return null;
  let start = text.indexOf('{');
  let end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    Logger.log('Could not locate JSON in text. Returning null.');
    return null;
  }

  let jsonStr = text.substring(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    Logger.log('JSON parse error: ' + err);
    return null;
  }
}

/**
 * Return or create the "Jobs" sheet in the main inbox spreadsheet.
 * Columns: [Timestamp, JobID, Status, PollAttempts, NextPollMins, Submissions]
 */
function getOrCreateJobsSheet(ss) {
  Logger.log('Retrieving or creating Jobs sheet...');
  let sheet = ss.getSheetByName(JOBS_SHEET_NAME);
  if (!sheet) {
    Logger.log('Jobs sheet not found. Creating new sheet named ' + JOBS_SHEET_NAME);
    sheet = ss.insertSheet(JOBS_SHEET_NAME);
    sheet.appendRow(['Timestamp', 'JobID', 'Status', 'PollAttempts', 'NextPollMins', 'Submissions']);
  }
  return sheet;
}
