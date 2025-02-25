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
      className="event-card flex justify-center items-center p-6"
      data-state={event.State || ''}
      data-date={dateKey}
      key={event.UUID}
    >
      <div className="max-w-[720px] mx-auto">
        <div class="relative flex bg-clip-border rounded-xl bg-white text-gray-700 shadow-md w-full max-w-[48rem] flex-row">

        {localFileName && (
          <div className="relative w-1/2 m-0 overflow-hidden text-gray-700 bg-white rounded-r-none bg-clip-border rounded-xl shrink-0">
            <a href={`assets/images/${localFileName}`} data-title={escapeAttr(eventTitle)}>
              <img
                src={`assets/images/${localThumbnail}`}
                alt="Event Flyer"
                className="object-cover w-full h-full"
              />
            </a>
          </div>
        )}

        <div className="p-4">
          <h6 className="block mb-4 mt-0 pt-0 font-sans text-base antialiased font-semibold leading-relaxed tracking-normal text-gray-700 uppercase">
            {displayLocation}
          </h6>
          <h4 className="block mb-2 font-sans text-2xl antialiased font-semibold leading-snug tracking-normal text-blue-gray-900">
            {eventTitle}
          </h4>
          <h7 className="block mb-4 mt-0 pt-0 font-sans text-base antialiased font-semibold leading-relaxed tracking-normal text-gray-700 uppercase">
            <p>🗓️ {dateKey} - {displayTime}</p>
          </h7>
          <div className='block mb-8 font-sans text-sm antialiased font-normal leading-relaxed text-gray-700'>
            <p>{event.Description || ''}</p>
          </div>
          <div className='block mb-8 font-sans text-sm antialiased font-normal leading-relaxed text-gray-700'>
            <p>📍 {event.Address || '' }</p>
            {event["Meeting Location"] && <p>📝 { event["Meeting Location"] || ''}</p>}
            {event.Links && <p>🔗 {event.Links}</p>}
            {event.Sponsors && <p>﹫ {event.Sponsors}</p>}
          </div>

          <div className="block mb-8 font-sans text-base antialiased font-normal leading-relaxed text-gray-700">
            <a
              href={`events/${event.UUID}.html`}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-sm"
            >
              Details Page
            </a>
          </div>

          <div className="block mb-8 font-sans text-base antialiased font-normal leading-relaxed text-gray-700">
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
    </div>
    </div>
  );
}