// language: jsx
import React from 'react';
import { humanizeDatetime, humanizeDate, humanizeTime } from '../tasks/parseDates';

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
  const displayDatetime = humanizeDatetime(`${dateKey} ${event.Time}`);
  const displayDate = humanizeDate(dateKey);
  const displayTime = humanizeTime(event.Time);
  const displayLocation = `${event.City || ''}, ${event.State || ''}`.replace(/,\s*$/, '');
  const localFileName = event.localImagePath ? event.localImagePath.split('/').pop() : null;
  const localThumbnail = event.localThumbnailPath ? event.localThumbnailPath.split('/').pop() : null;

  const plainText = [
    eventTitle,
    displayDatetime,
    displayLocation,
    event.Address || '',
    event.Links || '',
    event.Sponsors || ''
  ].join('\n');

  const htmlData = `<strong>${eventTitle}</strong><br>` +
    `${displayDatetime}<br>` +
    `${displayLocation}<br>` +
    `${event.Address || ''}<br>` +
    `${event.Links || ''}<br>` +
    `${event.Sponsors || ''}<br>`;

  const markdownData = `**${eventTitle}**\n` +
    `${displayDatetime}\n` +
    `${displayLocation}\n` +
    `${event.Address || ''}\n` +
    `${event.Links || ''}\n` +
    `${event.Sponsors || ''}\n`;

  return (
    <div
      className="event-card flex justify-center items-center p-4"
      data-state={event.State || ''}
      data-date={dateKey}
      key={event.UUID}
    >
        <div className="relative flex w-full max-w-[26rem] flex-col rounded-xl bg-white bg-clip-border text-gray-700 shadow-lg">

          {localFileName && (
            <div className="relative mx-4 mt-4 overflow-hidden text-white shadow-lg rounded-xl bg-blue-gray-500 bg-clip-border shadow-blue-gray-500/40">
              <a href={`assets/images/${localFileName}`} data-title={escapeAttr(eventTitle)}>
                <img
                  src={`assets/images/${localThumbnail}`}
                  alt="Event Flyer"
                  className="object-cover w-full h-52"
                />
              </a>
            </div>
          )}

          <div className="p-4">
            <div className="items-center justify-between mb-2">

              <div>
                <h4 className="block font-sans text-xl antialiased font-bold leading-snug tracking-normal text-blue-gray-900">
                  {eventTitle}
                </h4>
                <p className="block mb-4 mt-0 pt-0 font-sans text-base antialiased font-semibold leading-relaxed tracking-normal text-gray-700 uppercase">
                  {displayLocation}
                </p>
              </div>

              { event.Description &&
              <div className='block font-sans mb-6 text-base antialiased font-normal leading-relaxed text-gray-700'>
                <p>{event.Description || ''}</p>
              </div>}

              <div className='block items-center justify-between text-sm w-full p-5 bg-white border-2 rounded-lg group border-neutral-200/70 text-neutral-600'>
                <div className="flex justify-start mb-2">
                  <div className="mr-2">🗓️</div>
                  <div>{displayDate}</div>
                </div>
                <div className="flex justify-start mb-2">
                  <div className="mr-2">️🕒</div>
                  <div>{displayTime}</div>
                </div>
                { event.Address &&
                <div className="flex justify-start mb-2">
                  <div className="mr-2">📍</div>
                  <div>{event.Address}<br/>{displayLocation}</div>
                </div> }
                {event["Meeting Location"] && 
                <div className="flex justify-start mb-2">
                  <div className="mr-2">📝</div>
                  <div>{ event["Meeting Location"] }</div>
                </div>}
                {event.Links && 
                <div className="flex justify-start mb-2">
                  <div className="mr-2">🔗</div>
                  <div>{ event.Links }</div>
                </div>}
                {event.Sponsors && 
                <div className="flex justify-start mb-2">
                  <div className="mr-2">﹫</div>
                  <div>{ event.Sponsors }</div>
                </div>}
              </div>

              <div className="block font-sans text-sm antialiased font-light leading-relaxed text-gray-700">
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