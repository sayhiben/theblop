import React from 'react';
import { EventCard } from './EventCard';

export function EventPage({ eventData }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <title>{eventData.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="../dist/styles.css" rel="stylesheet" />
        <link rel="shortcut icon" type="image/x-icon" href="favicon.ico" />
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
          <EventCard key={eventData.UUID} event={eventData} dateKey={eventData.Date} baseAssetPath="../assets/images" />
        </main>

        {/* External clipboard script */}
        <script src="../dist/scripts/clipboard.js"></script>
      </body>
    </html>
  );
}