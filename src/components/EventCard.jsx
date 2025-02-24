// language: jsx
import React from 'react';

function escapeAttr(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '\\n');
}

export function EventCard({ event, dateKey }) {
  const eventTitle = event.Title || 'Untitled Event';
  const displayTime = event.Time || '';
  const displayLocation = `${event.City || ''}, ${event.State || ''}`.replace(/,\s*$/, '');
  const localFileName = event.localImagePath ? event.localImagePath.split('/').pop() : null;
  const localThumbnail = event.localThumbnailPath ? event.localThumbnailPath.split('/').pop() : null;

  const plainText = [
    eventTitle,
    `${dateKey} ${displayTime}`,
    displayLocation,
    event.Address || '',
    event.Links || '',
    event.Sponsors || ''
  ].join('\n');

  const htmlData = `<strong>${eventTitle}</strong><br>` +
    `${dateKey} ${displayTime}<br>` +
    `${displayLocation}<br>` +
    `${event.Address || ''}<br>` +
    `${event.Links || ''}<br>` +
    `${event.Sponsors || ''}<br>`;

  const markdownData = `**${eventTitle}**\n` +
    `${dateKey} ${displayTime}\n` +
    `${displayLocation}\n` +
    `${event.Address || ''}\n` +
    `${event.Links || ''}\n` +
    `${event.Sponsors || ''}\n`;

  return (
    <div
      className="event-card border border-gray-200 dark:border-gray-700 rounded overflow-hidden shadow-sm dark:shadow-none flex flex-col"
      data-state={event.State || ''}
      data-date={dateKey}
      key={event.UUID}
    >
      {localFileName && (
        <div className="relative">
          <a href={`assets/images/${localFileName}`} data-title={escapeAttr(eventTitle)}>
            <img
              src={`assets/images/${localThumbnail}`}
              alt="Event Flyer"
              className="w-full h-auto object-cover"
            />
          </a>
        </div>
      )}

      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <h3 className="text-lg font-semibold mb-2">{eventTitle}</h3>
          <p className="text-sm mb-1"><strong>Time:</strong> {displayTime}</p>
          <p className="text-sm mb-1"><strong>Location:</strong> {displayLocation}</p>
          <p className="text-sm mb-1"><strong>Address:</strong> {event.Address || ''}</p>
          <p className="text-sm mb-1"><strong>Meeting Location:</strong> {event["Meeting Location"] || ''}</p>
          <p className="text-sm mb-1"><strong>Description:</strong> {event.Description || ''}</p>
          <p className="text-sm mb-1"><strong>Links:</strong> {event.Links || ''}</p>
          <p className="text-sm mb-2"><strong>Sponsors:</strong> {event.Sponsors || ''}</p>
        </div>

        <div className="mt-2">
          <a
            href={`events/${event.UUID}.html`}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-sm"
          >
            Details Page
          </a>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="copy-btn inline-block px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer copy-plain"
            data-plain={escapeAttr(plainText)}
          >
            Copy Plain
          </button>
          <button
            className="copy-btn inline-block px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer copy-rich"
            data-plain={escapeAttr(plainText)}
            data-html={escapeAttr(htmlData)}
          >
            Copy Rich
          </button>
          <button
            className="copy-btn inline-block px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer copy-md"
            data-md={escapeAttr(markdownData)}
          >
            Copy MD
          </button>
        </div>
      </div>
    </div>
  );
}