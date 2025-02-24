/* src/components/EventPage.jsx */
import React from 'react';
import path from 'path';

function escapeForJS(str = '') {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n');
}

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
      <body className="p-4 lg:p-8 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 font-sans">
        <nav className="mb-6">
          <a
            href="../index.html"
            className="inline-block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
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
              <a
                href={`../assets/images/${filename}`}
                data-title={escapeForJS(eventTitle)}
              >
                <img
                  src={`../assets/images/${filename}`}
                  alt="Event Flyer"
                  className="w-full h-auto object-cover rounded shadow-md dark:shadow-none"
                />
              </a>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button id="copyPlain" className="inline-block px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              Copy Plain Text
            </button>
            <button id="copyRich" className="inline-block px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              Copy Rich Text
            </button>
            <button id="copyMarkdown" className="inline-block px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              Copy Markdown
            </button>
          </div>
        </main>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              const copyPlainBtn = document.getElementById('copyPlain');
              const copyRichBtn = document.getElementById('copyRich');
              const copyMdBtn = document.getElementById('copyMarkdown');

              const plainText = \`${escapeForJS(plainText)}\`;
              const htmlData = \`${escapeForJS(htmlData)}\`;
              const markdownData = \`${escapeForJS(markdownData)}\`;

              copyPlainBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(plainText)
                  .then(() => alert('Copied plain text!'))
                  .catch(err => console.error('Failed to copy plain text', err));
              });

              copyRichBtn.addEventListener('click', () => {
                const blobPlain = new Blob([plainText], { type: 'text/plain' });
                const blobHtml = new Blob([htmlData], { type: 'text/html' });
                const clipboardItem = new ClipboardItem({
                  'text/plain': blobPlain,
                  'text/html': blobHtml
                });
                navigator.clipboard.write([clipboardItem])
                  .then(() => alert('Copied as rich text!'))
                  .catch(err => console.error('Failed to copy rich text', err));
              });

              copyMdBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(markdownData)
                  .then(() => alert('Copied markdown!'))
                  .catch(err => console.error('Failed to copy markdown', err));
              });
            `
          }}
        />
      </body>
    </html>
  );
}
