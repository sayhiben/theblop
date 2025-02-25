import React from 'react';
import path from 'path';

export function EventPage({ eventData }) {
  const {
    UUID,
    Date: dateStr,
    Time,
    Title,
    Description,
    City,
    State,
    Address,
    'Meeting Location': MeetingLocation,
    Links,
    Sponsors,
    localImagePath,
  } = eventData;

  const eventTitle = Title || 'Untitled Event';
  const displayLocation = `${City || ''}, ${State || ''}`.replace(/,\s*$/, '');

  // Prepare copy strings
  const plainText = `${eventTitle}\n${dateStr || ''} ${Time || ''}\n${displayLocation}\n${Address || ''}\n${Links || ''}\n${Sponsors || ''}\n`;
  const htmlData = `<strong>${eventTitle}</strong><br>${dateStr || ''} ${Time || ''}<br>${displayLocation}<br>${Address || ''}<br>${Links || ''}<br>${Sponsors || ''}<br>`;
  const markdownData = `**${eventTitle}**\n${dateStr || ''} ${Time || ''}\n${displayLocation}\n${Address || ''}\n${Links || ''}\n${Sponsors || ''}\n`;

  let filename = '';
  if (localImagePath) {
    filename = path.basename(localImagePath);
  }

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <title>{eventTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="../dist/styles.css" rel="stylesheet" />
      </head>
      <body className="p-4 lg:p-8 bg-white text-gray-900 font-sans">
        <nav className="mb-6">
          <a
            href="../index.html"
            className="inline-block text-blue-600 hover:text-blue-800 underline"
          >
            &larr; Back to Events
          </a>
        </nav>

        <main className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">{eventTitle}</h1>
          <p className="mb-2"><strong>Date &amp; Time:</strong> {dateStr || ''} {Time || ''}</p>
          <p className="mb-2"><strong>Location:</strong> {displayLocation}</p>
          <p className="mb-2"><strong>Address:</strong> {Address || ''}</p>
          <p className="mb-2"><strong>Meeting Location:</strong> {MeetingLocation || ''}</p>
          <p className="mb-2"><strong>Description:</strong> {Description || ''}</p>
          <p className="mb-2"><strong>Links:</strong> {Links || ''}</p>
          <p className="mb-2"><strong>Sponsors:</strong> {Sponsors || ''}</p>

          {filename && (
            <div className="my-6">
              <a href={`../assets/images/${filename}`} data-title={eventTitle}>
                <img
                  src={`../assets/images/${filename}`}
                  alt="Event Flyer"
                  className="w-full h-auto object-cover rounded shadow-md"
                />
              </a>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="copy-btn inline-block px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors cursor-pointer copy-plain"
              data-plain={plainText}
            >
              Copy Plain Text
            </button>
            <button
              className="copy-btn inline-block px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors cursor-pointer copy-rich"
              data-plain={plainText}
              data-html={htmlData}
            >
              Copy Rich Text
            </button>
            <button
              className="copy-btn inline-block px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors cursor-pointer copy-md"
              data-md={markdownData}
            >
              Copy Markdown
            </button>
          </div>
        </main>

        {/* External clipboard script */}
        <script src="../scripts/clipboard.js"></script>
      </body>
    </html>
  );
}