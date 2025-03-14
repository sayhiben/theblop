// language: jsx
import React, { useState } from 'react';
import dayjs from 'dayjs';
import { humanizeDate } from '../tasks/parseDates';
import { getMapsUrl } from '../scripts/maps';

function escapeAttr(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '\\n');
}

function formatLocalDateTime(event) {
  // Convert event.Date + event.Time to a dayjs object without .utc().
  // We assume "YYYY-MM-DD" and "HH:mm" formats from your data
  const localDateTime = dayjs(`${event.Date} ${event.Time}`, 'YYYY-MM-DD HH:mm');
  // if you want a 1-hour end, you can do localDateTime.add(1,'hour') for end
  return localDateTime;
}

/**
 * Return start/end in 'YYYYMMDDTHHmmss' (no Z) for Google/Yahoo
 */
function getFloatingStartEndForGoogle(event) {
  const start = formatLocalDateTime(event);
  const end = start.add(1, 'hour'); // or however you want the end
  const startStr = start.format('YYYYMMDDTHHmmss');  // no [Z]
  const endStr = end.format('YYYYMMDDTHHmmss');      // no [Z]
  return [startStr, endStr];
}

/**
 * Return start/end in 'YYYY-MM-DDTHH:mm:ss' (no Z) for Outlook
 */
function getFloatingStartEndForOutlook(event) {
  const start = formatLocalDateTime(event);
  const end = start.add(1, 'hour');
  const startStr = start.format('YYYY-MM-DDTHH:mm:ss'); // no Z
  const endStr = end.format('YYYY-MM-DDTHH:mm:ss');
  return [startStr, endStr];
}

function getGoogleCalendarLink(event) {
  const [startLocal, endLocal] = getFloatingStartEndForGoogle(event);
  const title = encodeURIComponent(event.Title || 'Untitled Event');
  const details = encodeURIComponent(event.Description || '');
  const location = encodeURIComponent(`${event.Address || ''}, ${event.City || ''}, ${event.State || ''}`);
  // No &ctz param and no Z in dates => "floating" times
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startLocal}/${endLocal}&details=${details}&location=${location}`;
}

function getOutlookCalendarLink(event) {
  const [startLocal, endLocal] = getFloatingStartEndForOutlook(event);
  const title = encodeURIComponent(event.Title || 'Untitled Event');
  const details = encodeURIComponent(event.Description || '');
  const location = encodeURIComponent(`${event.Address || ''}, ${event.City || ''}, ${event.State || ''}`);

  // Outlook without trailing 'Z' => floating local time
  return `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent` +
    `&startdt=${startLocal}&enddt=${endLocal}&subject=${title}&body=${details}&location=${location}`;
}

function getYahooCalendarLink(event) {
  const [startLocal, endLocal] = getFloatingStartEndForGoogle(event);
  // we can reuse the Google format for Yahoo 
  const title = encodeURIComponent(event.Title || 'Untitled Event');
  const details = encodeURIComponent(event.Description || '');
  const location = encodeURIComponent(`${event.Address || ''}, ${event.City || ''}, ${event.State || ''}`);

  // Yahoo with no 'Z' => floating local time
  return `https://calendar.yahoo.com/?v=60&title=${title}&st=${startLocal}&et=${endLocal}&desc=${details}&in_loc=${location}`;
}

export function EventCard({ event, dateKey, baseAssetPath }) {
  const eventTitle = event.Title || 'Untitled Event';
  const displayDatetime = `${event.Date} ${event.Time}`;
  const displayDate = humanizeDate(displayDatetime);
  const displayLocation = `${event.City || ''}, ${event.State || ''}`.replace(/,\s*$/, '');
  const localFileName = event.localImagePath ? event.localImagePath.split('/').pop() : null;
  const localThumbnail = event.localThumbnailPath ? event.localThumbnailPath.split('/').pop() : null;
  const permalink = `events/${event.UUID}.html`;

  const sanitizedCity = event.City ? event.City.replace(/[^a-zA-Z]/g, '').toLowerCase() : '';
  const sanitizedState = event.State ? event.State.replace(/[^a-zA-Z]/g, '').toLowerCase() : '';
  const sanitizedAddress = event.Address ? event.Address.replace(/[^a-zA-Z]/g, '').toLowerCase() : '';
  let displayAddress = event.Address || '';
  // If sanitizeddisplaylocation doesn't include city and state, append it
  if (!sanitizedAddress.includes(sanitizedCity) || !sanitizedAddress.includes(sanitizedState)) {
    displayAddress += `, ${displayLocation}`;
  }
  const mapUrl = getMapsUrl(displayAddress);

  function findURLs(text) {
    const regex = /\b(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;
    return text.match(regex) || [];
  }
 
  // event.Links could be a string like "[link1, link2]", "['link1', 'link2']", or "link1, link2", or might only have one link by itself "link1", so we need to coerce it into an array
  const links = event.Links.replace(/[\[\]']+/g, '').split(',').map((link) => {
    const l = link.trim().toLowerCase();
    // handle reddit links
    if (l.startsWith('/r/') || l.startsWith('r/')) {
      const path = l.replace('/r/', '').replace('r/', '');
      return `https://www.reddit.com/r/${path}`;
    }
    // otherwise if it's not a URL, toss it
    if (!findURLs(l).length) {
      return null;
    }
    if (!l || l === 'N/A' || l === '' || l === 'null' || l === 'undefined') {
      return null;
    }
    // add https:// to the link if it doesn't have a protocol
    if (!l.startsWith('http')) {
      return `https://${l}`;
    }
    return l;
  }).filter(l => l);

  const linkElements = links.map((link, i) => {
    return (
      <div key={i} className="flex justify-start mb-2">
        <div className="mr-2" title="Links">🔗</div>
        <a
          href={link}
          className="text-blue-600 dark:text-blue-200 hover:text-blue-800 underline text-sm"
          target='_blank'
          rel='noopener noreferrer'>
            {link}
        </a>
      </div>
    )
  })

  const copyHtml = `
  <div>
    ${localFileName
      ? `<img src="https://theblop.org/assets/images/${localThumbnail}" alt="Event Flyer" style="max-width:200px;"/>`
      : ''
    }
    <h3>${eventTitle}</h3>
    <p><strong>Date/Time:</strong> ${displayDatetime}</p>
    <p><strong>Address:</strong> ${displayAddress}</p>
    <p><strong>Meeting Location:</strong> ${event["Meeting Location"] || ''}</p>
    ${event.Links
      ? `<p><strong>Links:</strong> ${event.Links
        .split(',')
        .map(link => `<a href="${link.trim()}" target="_blank">${link.trim()}</a>`)
        .join(', ')}</p>`
      : ''
    }
    ${event.Sponsors
      ? `<p><strong>Sponsors:</strong> ${event.Sponsors}</p>`
      : ''
    }
    ${event.Description
      ? `<p><strong>Description:</strong> ${event.Description}</p>`
      : ''
    }
  </div>
`;

  const copyHtmlEscaped = escapeAttr(copyHtml);
  const copyText = `${eventTitle}
Date/Time: ${displayDatetime}
Address: ${displayAddress}
Meeting Location: ${event["Meeting Location"] || ''}
Links: ${event.Links}
Sponsors: ${event.Sponsors}
Description: ${event.Description}
`;

  return (
    <div
      className="event-card flex justify-center items-center p-2"
      data-state={event.State || ''}
      data-date={dateKey}
      key={event.UUID}
    >
      <div className="relative flex w-full max-w-[26rem] flex-col rounded-xl bg-white dark:bg-gray-800 bg-clip-border text-gray-700 dark:text-stone-200 shadow-lg">

        {localFileName && (
          <div className="relative mx-4 mt-4 overflow-hidden text-white shadow-lg rounded-xl bg-blue-gray-500 dark:bg-blue-gray-700 bg-clip-border shadow-blue-gray-500/40">
            <a href={`${baseAssetPath}/${localFileName}`} data-title={escapeAttr(eventTitle)}>
              <img
                src={`${baseAssetPath}/${localThumbnail}`}
                alt="Event Flyer"
                className="object-cover w-full h-67"
              />
            </a>
          </div>
        )}

        <div className="overflow-clip px-4 pt-4 pb-2">
          <div className="overflow-clip items-center justify-between mb-2">

            <div>
              <h3 className="block mb-1 font-sans text-xl antialiased font-bold leading-snug tracking-normal text-blue-gray-900 dark:text-stone-200">
                {eventTitle}
              </h3>
              <p className="block mb-4 mt-0 pt-0 font-sans text-base antialiased font-semibold leading-relaxed tracking-normal text-gray-700 dark:text-stone-200 uppercase">
                {displayLocation}
              </p>
            </div>

            {event.Description &&
              <div className='block font-sans mb-6 text-sm antialiased font-light leading-relaxed text-gray-700 dark:text-stone-200'>
                <p>{event.Description || ''}</p>
              </div>}

            <div className='overflow-clip block items-center justify-between text-sm w-full p-5 bg-white dark:bg-gray-900 border-2 rounded-lg group border-neutral-200/70 dark:border-gray-800/70 text-neutral-600 dark:text-stone-200'>
              <div className="flex justify-start mb-2">
                <div className="mr-2" title="Date">🗓️</div>
                <div>{displayDate || dateKey}</div>
              </div>
              <div className="flex justify-start mb-2">
                <div className="mr-2" title="Start time">️🕒</div>
                <div>{event.Time}</div>
              </div>
              {event.Address &&
                <div className="flex justify-start mb-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                  <div className="mr-2" title="Address">📍</div>
                  <div className="underline"><a href={mapUrl} rel="nofollow noreferer" target="_blank">{displayAddress}</a></div>
                </div>}
              {event["Meeting Location"] &&
                <div className="flex justify-start mb-2">
                  <div className="mr-2" title="Meeting Location">📝</div>
                  <div>{event["Meeting Location"]}</div>
                </div>}
              { linkElements && linkElements.length > 0 && linkElements }
              {event.Sponsors &&
                <div className="flex justify-start mb-2">
                  <div className="mr-2" title="Organizations and Sponsors">👥</div>
                  <div>{event.Sponsors}</div>
                </div>}
            </div>
          </div>
        </div>

        <div className="overflow-clip flex justify-end p-1">
          <div className="w-50 inline-flex p-2">
            {/* Report button */}
            <a
              className="cursor-pointer text-gray-400 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium px-2 py-2 inline-flex space-x-1 items-center"
              title="Report this event"
              href={`mailto:events+reports@seattleprotestnetwork.org?subject=Report%20Event%20${event.UUID}&body=Please%20provide%20details%20about%20why%20you%20are%20reporting%20this%20event.`}
              target="_blank"
            >
              <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 13H19.587C20.0495 13 20.2808 13 20.4128 12.903C20.528 12.8185 20.6015 12.6887 20.6147 12.5464C20.63 12.3833 20.511 12.185 20.273 11.7884L18.247 8.4116C18.1572 8.26195 18.1123 8.18712 18.0947 8.10724C18.0792 8.03659 18.0792 7.96341 18.0947 7.89276C18.1123 7.81288 18.1572 7.73805 18.247 7.5884L20.273 4.2116C20.511 3.81503 20.63 3.61674 20.6147 3.45359C20.6015 3.31133 20.528 3.18154 20.4128 3.09698C20.2808 3 20.0495 3 19.587 3H4L4 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            {/* Image search button */}
            <a
              href={`https://lens.google.com/uploadbyurl?url=https://theblop.org/assets/images/${localFileName}`}
              rel="nofollow noreferer"
              target="_blank"
              className="cursor-pointer text-gray-400 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium px-2 py-2 inline-flex space-x-1 items-center"
              title="Search Google for this image"
            >
              <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2.26953V6.40007C14 6.96012 14 7.24015 14.109 7.45406C14.2049 7.64222 14.3578 7.7952 14.546 7.89108C14.7599 8.00007 15.0399 8.00007 15.6 8.00007H19.7305M16 18.5L14.5 17M14 2H8.8C7.11984 2 6.27976 2 5.63803 2.32698C5.07354 2.6146 4.6146 3.07354 4.32698 3.63803C4 4.27976 4 5.11984 4 6.8V17.2C4 18.8802 4 19.7202 4.32698 20.362C4.6146 20.9265 5.07354 21.3854 5.63803 21.673C6.27976 22 7.11984 22 8.8 22H15.2C16.8802 22 17.7202 22 18.362 21.673C18.9265 21.3854 19.3854 20.9265 19.673 20.362C20 19.7202 20 18.8802 20 17.2V8L14 2ZM15.5 14.5C15.5 16.433 13.933 18 12 18C10.067 18 8.5 16.433 8.5 14.5C8.5 12.567 10.067 11 12 11C13.933 11 15.5 12.567 15.5 14.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            {/* Add to calendar button */}
{/* 
            <div className="relative inline-block text-left">
              <button
                type="button"
                className="add-to-calendar cursor-pointer text-gray-400 hover:text-blue-600
           text-sm font-medium px-2 py-2 inline-flex items-center"
                title="Add to calendar"
                id={`event-cal-button-${event.UUID}`}
                data-menu-id={`event-cal-menu-${event.UUID}`}
              >
                <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round" viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M21 8H3M16 2V5M8 2V5M12 18V12M9 15H15M7.8 22H16.2C17.8802 22 
               18.7202 22 19.362 21.673C19.9265 21.3854 20.3854 
               20.9265 20.673 20.362C21 19.7202 21 18.8802 
               21 17.2V8.8C21 7.11984 21 6.27976 20.673 5.63803C20.3854
               5.07354 19.9265 4.6146 19.362 4.32698C18.7202 4 
               17.8802 4 16.2 4H7.8C6.11984 4 5.27976 4 
               4.63803 4.32698C4.07354 4.6146 3.6146 5.07354 3.32698 
               5.63803C3 6.27976 3 7.11984 3 8.8V17.2C3 18.8802 3 
               19.7202 3.32698 20.362C3.6146 20.9265 4.07354 
               21.3854 4.63803 21.673C5.27976 22 6.11984 22 7.8 22Z"/>
                </svg>
              </button>

              <div
                id={`event-cal-menu-${event.UUID}`}
                className="hidden origin-top-right absolute right-0 mt-2 w-48
           rounded-lg shadow-lg bg-white border border-gray-200 z-8900"
              >
                <ul className="py-1">
                  <li>
                    <a
                      href={`webcal://theblop.org/assets/ical/${event.UUID}.ics`}
                      download
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Apple / Generic (.ics)
                    </a>
                  </li>
                  <li>
                    <a
                      href={getGoogleCalendarLink(event)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      target="_blank"
                    >
                      Google Calendar
                    </a>
                  </li>
                  <li>
                    <a
                      href={getOutlookCalendarLink(event)}  
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      target="_blank"
                    >
                      Outlook
                    </a>
                  </li>
                </ul>
              </div>
            </div>
 */}
            {/* Map link */}
            <a
              href={mapUrl}
              rel="nofollow noreferer"
              target="_blank"
              className="cursor-pointer text-gray-400 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium px-2 py-2 inline-flex space-x-1 items-center"
              title="View on map"
            >
              <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L2 22V6L9 2M9 18L16 22M9 18V2M16 22L22 18V2L16 6M16 22V6M16 6L9 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            {/* Copy button */}
            <button
              className="copy-btn cursor-pointer text-gray-400 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium px-2 py-2 inline-flex space-x-1 items-center"
              data-plain={copyText}
              data-html={copyHtmlEscaped}
              title="Copy event details"
            >
              <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 15C4.06812 15 3.60218 15 3.23463 14.8478C2.74458 14.6448 2.35523 14.2554 2.15224 13.7654C2 13.3978 2 12.9319 2 12V5.2C2 4.0799 2 3.51984 2.21799 3.09202C2.40973 2.71569 2.71569 2.40973 3.09202 2.21799C3.51984 2 4.0799 2 5.2 2H12C12.9319 2 13.3978 2 13.7654 2.15224C14.2554 2.35523 14.6448 2.74458 14.8478 3.23463C15 3.60218 15 4.06812 15 5M12.2 22H18.8C19.9201 22 20.4802 22 20.908 21.782C21.2843 21.5903 21.5903 21.2843 21.782 20.908C22 20.4802 22 19.9201 22 18.8V12.2C22 11.0799 22 10.5198 21.782 10.092C21.5903 9.71569 21.2843 9.40973 20.908 9.21799C20.4802 9 19.9201 9 18.8 9H12.2C11.0799 9 10.5198 9 10.092 9.21799C9.71569 9.40973 9.40973 9.71569 9.21799 10.092C9 10.5198 9 11.0799 9 12.2V18.8C9 19.9201 9 20.4802 9.21799 20.908C9.40973 21.2843 9.71569 21.5903 10.092 21.782C10.5198 22 11.0799 22 12.2 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {/* Permalink button */}
            <button
              className="copy-btn cursor-pointer text-gray-400 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium px-2 py-2 inline-flex space-x-1 items-center"
              data-plain={escapeAttr(permalink)}
              data-copy-type="permalink"
              title="Copy permalink"
            >
              <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.7076 18.3639L11.2933 19.7781C9.34072 21.7308 6.1749 21.7308 4.22228 19.7781C2.26966 17.8255 2.26966 14.6597 4.22228 12.7071L5.63649 11.2929M18.3644 12.7071L19.7786 11.2929C21.7312 9.34024 21.7312 6.17441 19.7786 4.22179C17.826 2.26917 14.6602 2.26917 12.7076 4.22179L11.2933 5.636M8.50045 15.4999L15.5005 8.49994" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

    </div >
  );
}
