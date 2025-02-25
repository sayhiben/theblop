import React from 'react';
import { EventCard } from './EventCard';
import { humanizeDate } from '../tasks/parseDates';
import { SiteAlerts } from './Alerts';
import { alerts } from '../alerts';

export function IndexPage({ futureEvents, grouped, allStates }) {
  // Get sorted date keys
  const dateKeys = Object.keys(grouped).sort();

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
        <header className="mb-6 top-0 sm:h-24 h-35 sticky bg-stone-50 dark:bg-gray-900 z-99 pt-4">
          <h1 className="text-3xl font-bold mb-4">The Big List of Protests</h1>
          {/* Filters */}
          <div className="bg-stone-50 dark:bg-gray-900 z-98 flex flex-col sm:flex-row items-start sm:items-end sm:space-x-4 space-y-2 sm:space-y-0 pb-4 border-b border-gray-300 dark:border-stone-800">
            <div>
              <label htmlFor="stateFilter" className="font-medium mr-2">Filter by State:</label>
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
              <label htmlFor="dateFilter" className="font-medium mr-2">Filter by Date:</label>
              <select
                id="dateFilter"
                className="px-2 py-1 border rounded focus:outline-none focus:ring focus:border-blue-300"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="WEEKEND">Weekends</option>
              </select>
            </div>
          </div>
        </header>

        <SiteAlerts alerts={alerts} />

        <div id="eventList" className="space-y-8">
          {dateKeys.map(dateKey => {
            if (!dateKey || dateKey === 'Invalid Date') return null;
            const eventsForThisDate = grouped[dateKey] || [];
            if (eventsForThisDate.length === 0) return null;

            return (
              <div className="date-group" key={dateKey}>
                <h2 className="sticky bg-stone-200 dark:bg-gray-600 rounded-sm p-2 z-89 sm:top-28 top-37 text-xl font-semibold my-4 border-b border-gray-300 dark:border-stone-800">
                  {humanizeDate(dateKey)}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <script src="dist/scripts/filters.js"></script>
        <script src="dist/scripts/clipboard.js"></script>
      </body>
    </html>
  );
}