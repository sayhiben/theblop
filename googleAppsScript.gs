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

  // Search only unread messages in the inbox
  const threads = GmailApp.search('in:inbox is:unread');
  Logger.log('Found ' + threads.length + ' unread thread(s) in the inbox.');

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

        // Extract links from body
        const linkRegex = /https?:\/\/\S+/g;
        const links = bodyText.match(linkRegex) || [];
        Logger.log('Extracted ' + links.length + ' link(s) from email body.');

        // Handle attachments
        const attachments = message.getAttachments({includeInlineImages: false});
        Logger.log('Found ' + attachments.length + ' attachment(s) to process for images.');

        const images = [];
        attachments.forEach(att => {
          if (att.getContentType().match(/^image\//)) {
            const file = folder.createFile(att.copyBlob());
            const imageUrl = file.getUrl();
            const imageId = file.getId();
            images.push({ "id": imageId, "url": imageUrl });
            Logger.log('Image saved to Drive. ID: ' + imageId + ', URL: ' + imageUrl);
          }
        });

        // Append row to RawData
        const imageUrls = images.map((img) => img.url);
        const imageIds = images.map((img) => img.id);

        Logger.log('Appending row to RawData with UUID: ' + uuid);
        sheet.appendRow([
          date,
          uuid,
          subject,
          bodyText,
          links.join(', '),
          imageUrls.join(', '),
          imageIds.join(', '),
          'false' // processed flag
        ]);

        // Mark message as read
        message.markRead();
        Logger.log('Marked message as read. Subject: ' + subject);
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
  // data[0] = header row: [Date, UUID, Subject, Body, Links, Image URLs, Image Ids, Processed]
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
    const jobId = respData.id || respData.jobId;
    if (!jobId) {
      Logger.log('No jobId in response: ' + response.getContentText());
      return;
    }

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

  // Identify columns by index:
  // 0=Timestamp, 1=JobID, 2=Status, 3=PollAttempts, 4=NextPollMins, 5=Submissions
  const now = new Date();
  let anyStillRunning = false;
  let earliestNextPoll = null; // keep track of the smallest nextPollMins we'll need

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowIndex = i + 1; // 1-based in the sheet

    let jobId = row[1];
    let status = row[2];
    let pollAttempts = row[3];
    let nextPollMins = row[4];
    let submissionsStr = row[5];
    let lastUpdateTime = row[0]; // Date

    if (typeof status !== 'string') status = String(status);

    // If job is already COMPLETED or FAILED, skip
    if (status === 'COMPLETED' || status === 'FAILED') {
      Logger.log('Job ' + jobId + ' already ' + status + '. Skipping...');
      continue;
    }

    // Check if enough time has passed to poll again
    if (!(lastUpdateTime instanceof Date)) {
      // If there's no valid timestamp, skip or fix
      Logger.log('Warning: Last update time for job ' + jobId + ' is invalid. Skipping poll for this job.');
      continue;
    }

    let diffMs = now - lastUpdateTime; // in ms
    let diffMins = diffMs / 1000 / 60;
    Logger.log('Job ' + jobId + ' last polled ' + diffMins.toFixed(2) + ' minute(s) ago; next poll is in ' + nextPollMins + ' minute(s).');

    if (diffMins < nextPollMins) {
      // Not time to poll yet
      anyStillRunning = true;
      let timeUntilNextPoll = nextPollMins - diffMins;
      Logger.log('Not enough time elapsed for job ' + jobId + '. Will poll again in ~' + timeUntilNextPoll.toFixed(2) + ' minute(s).');
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
      Logger.log('checkRunPodJobStatus() returned null for job ' + jobId + '. Possibly a transient error.');
      // Means an error calling the status endpoint
      // We'll treat it as a transient error: increment pollAttempts, double nextPoll?
      pollAttempts++;
      let newNextPoll = getNewNextPollInterval(pollAttempts, nextPollMins);

      jobsSheet.getRange(rowIndex, 4).setValue(pollAttempts);        // col=3 is PollAttempts
      jobsSheet.getRange(rowIndex, 5).setValue(newNextPoll);         // col=4 is NextPollMins
      jobsSheet.getRange(rowIndex, 3).setValue('RUNNING');           // col=2 is Status

      Logger.log('Job ' + jobId + ' marked as RUNNING with pollAttempts=' + pollAttempts + ' and nextPollMins=' + newNextPoll + '.');

      anyStillRunning = true;
      if (earliestNextPoll == null || newNextPoll < earliestNextPoll) {
        earliestNextPoll = newNextPoll;
      }
      continue;
    }

    // pollResult is { status: 'RUNNING'|'COMPLETED'|'FAILED', data: ... }
    if (pollResult.status === 'RUNNING') {
      pollAttempts++;
      let newNextPoll = getNewNextPollInterval(pollAttempts, nextPollMins);

      jobsSheet.getRange(rowIndex, 3).setValue('RUNNING');        // Status
      jobsSheet.getRange(rowIndex, 4).setValue(pollAttempts);     // PollAttempts
      jobsSheet.getRange(rowIndex, 5).setValue(newNextPoll);      // NextPollMins

      Logger.log('Job ' + jobId + ' still running. Updated pollAttempts=' + pollAttempts + ', nextPollMins=' + newNextPoll + '.');

      anyStillRunning = true;
      if (earliestNextPoll == null || newNextPoll < earliestNextPoll) {
        earliestNextPoll = newNextPoll;
      }
    } else if (pollResult.status === 'COMPLETED') {
      Logger.log('Job ' + jobId + ' completed successfully.');
      jobsSheet.getRange(rowIndex, 3).setValue('COMPLETED');      // Status
      finalizeJobResults(pollResult.data, submissionsStr);
    } else if (pollResult.status === 'FAILED') {
      Logger.log('Job ' + jobId + ' reported FAILED status.');
      jobsSheet.getRange(rowIndex, 3).setValue('FAILED');         // Status
      markSubmissionsAsFailed(submissionsStr);
    }
  }

  // 3. If any jobs are still pending, schedule a new run
  if (anyStillRunning && earliestNextPoll != null) {
    let waitMins = Math.ceil(earliestNextPoll);
    if (waitMins < 1) waitMins = 1; // ensure at least 1 minute
    Logger.log('Scheduling next pollRunPodJobs() in ' + waitMins + ' minute(s).');
    createOneTimeTrigger('pollRunPodJobs', waitMins);
  } else {
    Logger.log('No further polling needed at this time.');
  }

  Logger.log('Completed pollRunPodJobs().');
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Creates a one-time time-based trigger for a function to run in "minutesFromNow" minutes.
 * This returns the created trigger, but normally we don't need it for anything else.
 */
function createOneTimeTrigger(functionName, minutesFromNow) {
  Logger.log('Creating one-time trigger for ' + functionName + ' to run in ' + minutesFromNow + ' minute(s).');
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
    let url = RUNPOD_ENDPOINT_URL.replace("/run", "/status/") + jobId; // adapt if your endpoint differs
    Logger.log('Checking status at ' + url + " ...");
    let response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + RUNPOD_API_KEY },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('Error checking job status (code ' + response.getResponseCode() + '): ' + response.getContentText());
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
 * Basic approach:
 *  - If pollAttempts == 0 => 5 mins (set initially)
 *  - If pollAttempts == 1 => 1 min
 *  - If pollAttempts == 2 => 2 min
 *  - If pollAttempts == 3 => 4 min
 *  - If pollAttempts == 4 => 8 min
 *  - Then clamp at 10 min
 */
function getNewNextPollInterval(pollAttempts, prevInterval) {
  Logger.log('Calculating new next poll interval with pollAttempts=' + pollAttempts + ', prevInterval=' + prevInterval);
  let newInterval;
  if (pollAttempts === 1) {
    // after 1st poll, do 1 min
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
 * Mark job results in the RawData and Processed sheets.
 * jobData is array: [ { submissionId, answer }, ... ]
 * submissionsStr is the JSON of { submissionId, imageIds }
 */
function finalizeJobResults(jobData, submissionsStr) {
  Logger.log('finalizeJobResults() called.');
  
  // Open the processed spreadsheet
  const processedSS = SpreadsheetApp.openById(PROCESSED_SPREADSHEET_ID);
  const processedSheet = processedSS.getSheetByName(PROCESSED_SHEET_NAME);
  
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

  // Map from submissionId => job result (the AI's answer)
  let resultMap = {};
  jobData.forEach(item => {
    const subId = item.submissionId;
    const rawAnswer = item.answer;
    const extracted = extractJsonFromText(rawAnswer);

    if (extracted) {
      resultMap[subId] = extracted;
      Logger.log('Successfully extracted JSON for submission ' + subId);
    } else {
      Logger.log('Could not parse JSON for submission: ' + subId);
      resultMap[subId] = { status: 'failed', reason: 'No valid JSON extracted' };
    }
  });

  // Build a map from submissionId => row index in RawData
  const rawValues = rawDataSheet.getDataRange().getValues(); // 2D
  let uuidCol = 1; // "UUID" is column index 1
  let processedCol = 7; // "Processed" is column index 7
  let uuidToRowIndex = {};
  for (let r = 1; r < rawValues.length; r++) {
    let uuid = rawValues[r][uuidCol];
    uuidToRowIndex[uuid] = r + 1; // 1-based row
  }

  // For each submission, write to Processed sheet if success, or mark RawData as failed
  submissions.forEach(sub => {
    let subId = sub.submissionId;
    let rowIndex = uuidToRowIndex[subId];
    let result = resultMap[subId];

    if (!result) {
      Logger.log('No result found for submission ' + subId + '; marking as failed.');
      markRowFailed(rawDataSheet, rowIndex);
      return;
    }

    if (result.status === 'failed') {
      Logger.log('Result for submission ' + subId + ' indicates failure. Marking row as failed.');
      markRowFailed(rawDataSheet, rowIndex);
      return;
    }

    Logger.log('Marking submission ' + subId + ' as processed in RawData sheet.');
    // Mark rawData as processed
    rawDataSheet.getRange(rowIndex, processedCol + 1).setValue('true');

    // Insert data into Processed
    // The processed sheet columns are:
    // 0=UUID, 1=Date, 2=Time, 3=Title, 4=Description, 5=City,
    // 6=State, 7=Address, 8=Meeting Location, 9=Links, 10=Sponsors,
    // 11=Image, 12=Source, 13=Extracted Text
    Logger.log('Storing result: ' + result)
    let rowVals = [];
    rowVals[0]  = subId;
    rowVals[1]  = result.date || '';
    rowVals[2]  = result.time || '';
    rowVals[3]  = result.title || '';
    rowVals[4]  = result.description || '';
    rowVals[5]  = result.city || '';
    rowVals[6]  = result.state || '';
    rowVals[7]  = result.address || '';
    rowVals[8]  = result.meeting_location || '';
    rowVals[9]  = result.links || '';
    rowVals[10] = result.sponsors || '';
    rowVals[11] = result.image || '';
    rowVals[12] = result.source || '';
    rowVals[13] = result.extracted_text || '';

    processedSheet.appendRow(rowVals);
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
  let processedCol = 7;
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
