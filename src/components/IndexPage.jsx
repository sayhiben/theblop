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
            <div className="flex items-start justify-start ml-2">
              <a
                href="about.html"
                className="inline-block text-gray-500 dark:text-gray-400 h-5"
                title="About the Big List of Protests"
              >
                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.4996 9.00224C10.6758 8.50136 11.0236 8.079 11.4814 7.80998C11.9391 7.54095 12.4773 7.4426 13.0006 7.53237C13.524 7.62213 13.9986 7.89421 14.3406 8.30041C14.6825 8.70661 14.8697 9.22072 14.8689 9.75168C14.8689 11.2506 12.6205 12 12.6205 12M12.6495 15H12.6595M12.4996 20C17.194 20 20.9996 16.1944 20.9996 11.5C20.9996 6.80558 17.194 3 12.4996 3C7.8052 3 3.99962 6.80558 3.99962 11.5C3.99962 12.45 4.15547 13.3636 4.443 14.2166C4.55119 14.5376 4.60529 14.6981 4.61505 14.8214C4.62469 14.9432 4.6174 15.0286 4.58728 15.1469C4.55677 15.2668 4.48942 15.3915 4.35472 15.6408L2.71906 18.6684C2.48575 19.1002 2.36909 19.3161 2.3952 19.4828C2.41794 19.6279 2.50337 19.7557 2.6288 19.8322C2.7728 19.9201 3.01692 19.8948 3.50517 19.8444L8.62619 19.315C8.78127 19.299 8.85881 19.291 8.92949 19.2937C8.999 19.2963 9.04807 19.3029 9.11586 19.3185C9.18478 19.3344 9.27145 19.3678 9.44478 19.4345C10.3928 19.7998 11.4228 20 12.4996 20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>
            </div>
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