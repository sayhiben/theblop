import React from 'react';
import { EventCard } from './EventCard';
import { humanizeDate } from '../tasks/parseDates';
import { SiteAlerts } from './SiteAlerts';
import { alerts } from '../alerts';
import { PostFlyerModal } from './PostFlyerModal';

export function IndexPage({ futureEvents, grouped, allStates }) {
  // Get sorted date keys
  const dateKeys = Object.keys(grouped).sort();
  const submissionEmail = "events@seattleprotestnetwork.org";
  const smsLink = `sms:${submissionEmail}?body=Please%20attach%20a%20flyer%20image%20only.`;
  const emailLink = `mailto:${submissionEmail}?subject=New%20Protest%20Flyer&body=Please%20attach%20a%20flyer%20image%20only.`;

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <title>The Big List of Protests: Upcoming</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="dist/styles.css" rel="stylesheet" />
        <link rel="shortcut icon" type="image/x-icon" href="favicon.ico" />
      </head>
      <body className="px-4 pb-4 lg:px-8 lg:pb-8 bg-stone-50 text-gray-900 dark:bg-gray-900 dark:text-stone-50 font-sans">
        <header className="top-0 sm:h-28 h-35 sticky bg-stone-50 dark:bg-gray-900 z-99 pt-4">
          <div className="flex justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4">
              ✊ The Big List of Protests
            </h1>
          </div>
          <div className="flex text-xs sm:text-sm md:text-md justify-between items-center pb-4 px-2 border-b border-gray-300 dark:border-stone-800">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div>
                <label htmlFor="stateFilter" className="mr-2">
                  Filter by State:
                </label>
                <select
                  id="stateFilter"
                  className="px-2 py-1 border rounded focus:outline-none focus:ring focus:border-blue-300"
                >
                  <option value="ALL">All States</option>
                  {allStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dateFilter" className="mr-2">
                  Filter by Date:
                </label>
                <select
                  id="dateFilter"
                  className="px-2 py-1 border rounded focus:outline-none focus:ring focus:border-blue-300"
                >
                  <option value="ALL">All Dates</option>
                  <option value="TODAY">Today</option>
                  <option value="TOMORROW">Tomorrow</option>
                  <option value="WEEK">This Week</option>
                  <option value="WEEKEND">Weekends</option>
                </select>
              </div>
            </div>
            <div className="max-w-35 flex">
              <button id="openModalButton" className="flex cursor-pointer bg-green-500 hover:bg-green-600 text-white font-bold py-5 sm:py-1 px-2 rounded focus:outline-none focus:shadow-outline">
                <svg className="h-5 mr-2 object-center" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 4v16m8-8H4"></path>
                </svg>
                <p>Post a Flyer</p>
              </button>
            </div>
          </div>
        </header>

        <SiteAlerts alerts={alerts} />
        <PostFlyerModal smsLink={smsLink} emailLink={emailLink} />

        <div id="eventList" className="space-y-8">
          {dateKeys.map(dateKey => {
            if (!dateKey || dateKey === 'Invalid Date') return null;
            const eventsForThisDate = grouped[dateKey] || [];
            if (eventsForThisDate.length === 0) return null;

            return (
              <div className="date-group" key={dateKey}>
                <h2 className="sticky bg-stone-200 dark:bg-gray-600 rounded-sm p-2 z-89 sm:top-28 top-33 text-xl font-semibold my-4 border-b border-gray-300 dark:border-stone-800">
                  {humanizeDate(dateKey)}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {eventsForThisDate.map(e => (
                    <EventCard key={e.UUID} event={e} dateKey={dateKey} baseAssetPath='assets/images' />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div id="noEventsMessage" className="hidden text-gray-500 dark:text-stone-500 mt-4 italic"></div>

        {/* External scripts for filtering and clipboard behavior */}
        <script src="dist/scripts/clipboard.js"></script>
        <script src="dist/scripts/filters.js"></script>
        <script src="dist/scripts/modal.js"></script>
      </body>
    </html>
  );
}