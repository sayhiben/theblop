import React from 'react';

export function AboutPage() {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <title>About the Big List of Protests</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="shortcut icon" type="image/x-icon" href="favicon.ico" />
        <link href="dist/styles.css" rel="stylesheet" />
      </head>
      <body className="p-4 lg:p-8 bg-white text-gray-900 dark:bg-gray-900 dark:text-stone-50 font-sans">
        <nav className="mb-6">
          <a
            href="index.html"
            className="inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
          >
            &larr; Back to Events
          </a>
        </nav>

        <main className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">About the ✊ Big List of Protests</h1>
          <p className="mb-4">
            The Big List of Protests ("the BLOP") is a community-driven project to help people find and share information about protests, rallies, and other events in the United States.
          </p>
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-start">
            <div className="flex">
              <a href="mailto:events+report@seattleprotestnetwork.org" className="inline-flex gap-2 items-center justify-center border align-middle text-center text-sm py-2 px-4 shadow-sm bg-stone-200 relative border-stone-200 text-stone-700 rounded-lg">
                Report an Issue with an Event
              </a>
            </div>
            <div className="flex">
              <a href="https://github.com/sayhiben/theblop/issues" target="_blank" className="inline-flex gap-2 items-center justify-center border align-middle text-center text-sm py-2 px-4 shadow-sm bg-stone-200 relative border-stone-200 text-stone-700 rounded-lg">
                Submit a Bug Report
              </a>
            </div>
            <div className="flex">
              <a href="https://github.com/sayhiben/theblop/" target="_blank" className="inline-flex gap-2 items-center justify-center border align-middle text-center text-sm py-2 px-4 shadow-sm bg-stone-200 relative border-stone-200 text-stone-700 rounded-lg">
                Visit the Project Page on GitHub
              </a>
            </div>
          </div>
            
          <h2 className="text-2xl font-bold mb-2">About Event Listings</h2>
          <p className="mb-4">
            Posted events are provided by site users who upload flyer images. The BLOP periodically scans its inbox for new flyers and performs sophisticated image recognition to extract event details in order to create event listings. This process is not perfect and may result in incorrect or incomplete information. Always verify event details with the event organizer.
          </p>
          <p className="mb-4">
            The BLOP is updated roughly every six hours. If you don't see your event listed immediately, please be patient. If you believe your event has been missed, please use the "Report" button at the top of this page to contact moderators.
          </p>
          <p className="mb-4">
            The BLOP is a public service and does not endorse or verify the accuracy of any event listing. We do not have the resources to fact-check every submission, so please use your best judgment when attending an event.
          </p>
          <p className="mb-4">
            The BLOP is not responsible for the content of external sites linked from event listings. We do not control the content of external sites and are not responsible for their availability or accuracy.
          </p>
          <h2 className="text-2xl font-bold mb-2">About Data Privacy</h2>
          <p className="mb-4">
            The BLOP does not collect or store any personal information about its users. We do not use cookies or tracking scripts; we don't even know how much traffic this site receives. We do not share data with third parties except for the purpose of moderation of abusive content.
          </p>
          <p className="mb-4">
            When you post an event, we process the information you provide and store data necessary to the operation of this site in multiple places:
          </p>
          <p className="mb-4">
            <ul className="list-disc list-inside mb-4">
              <li>Submissions are received at an email address provided by Google Workspaces.</li>
              <li>Submission details are stored in Google Drive for processing.</li>
              <li>Processed submission data is stored in a publicly viewable Google Sheet.</li>
              <li>The BLOP site re-hosts published submission data and images via GitHub Pages</li>
            </ul>
          </p>
          <p className="mb-4">
            The BLOP attempts to remove any EXIF data from images before storing and re-hosting. We do not guarantee that this process is perfect, so we ask that you do not submit images that contain sensitive metadata.
          </p>
          <p className="mb-4">
            Received messages, including any PII, email headers, etc., are deleted within 48 hours of receipt, after which time we only have access to the submitted message subject, body, and image(s). The only exception to this retention policy exists for messages that have been identified as abusive or illegal, which are retained for the purpose of reporting and blocking abusive users. Retained data is stored in a single, private email account.
          </p>
          <h2 className="text-2xl font-bold mb-2">Who made this?</h2>
          <p className='mb-4'>
            BLOP was written by unpaid volunteers. The project is open-source and available on GitHub. If you would like to contribute, please visit the <a href="https://github.com/sayhiben/theblop" target="_blank" className="text-blue-500">project page.</a>
          </p>
          <h2 className="text-2xl font-bold mb-2">Is there an API?</h2>
          <p className='mb-4'>
            The BLOP site is statically generated from a Google Sheet on a schedule. You may download the CSV data from this public Google Sheet at <a href="https://docs.google.com/spreadsheets/d/e/2PACX-1vT4ejObVvtY9C-dAH5wmUFDOW3K6uRGT6SCZPmr2ZPD1Sh-wb9OEeLj-lvqlUD-MFoDFof4cLGamxlz/pub?gid=0&single=true&output=csv" target="_blank" className='text-blue-500'>https://docs.google.com/spreadsheets/d/e/2PACX-1vT4ejObVvtY9C-dAH5wmUFDOW3K6uRGT6SCZPmr2ZPD1Sh-wb9OEeLj-lvqlUD-MFoDFof4cLGamxlz/pub?gid=0&single=true&output=csv</a>
          </p>
          <p className='mb-4'>
            Efforts will be made to ensure a stable URL and shape of the CSV, but no guarantees are made. Please limit your requests to once every 15 minutes; the sheet does not update more frequently than that.
          </p>
        </main>
      </body>
    </html>
  );
}