/* src/components/IndexPage.jsx */
import React from 'react';

export function IndexPage({ futureEvents, grouped, allStates }) {
  // We expect `grouped` to be an object of date => events array
  // We'll sort the date keys in the parent (or we can do it here).

  // For convenience, let's extract the sorted keys:
  const dateKeys = Object.keys(grouped).sort();

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <title>Upcoming Events</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="dist/styles.css" rel="stylesheet" />
      </head>
      <body className="p-4 lg:p-8 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 font-sans">

        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Upcoming Events</h1>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end sm:space-x-4 space-y-2 sm:space-y-0 mb-4">
            <div>
              <label htmlFor="stateFilter" className="font-medium mr-2">Filter by State:</label>
              <select
                id="stateFilter"
                className="px-2 py-1 border rounded focus:outline-none focus:ring focus:border-blue-300 dark:bg-gray-800 dark:border-gray-700"
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
                className="px-2 py-1 border rounded focus:outline-none focus:ring focus:border-blue-300 dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="WEEKEND">This Weekend</option>
                <option value="WEEK">This Week</option>
              </select>
            </div>
          </div>
        </header>

        <div id="eventList" className="space-y-8">
          {dateKeys.map(dateKey => {
            if (!dateKey || dateKey === 'Invalid Date') return null;
            const eventsForThisDate = grouped[dateKey] || [];
            if (eventsForThisDate.length === 0) return null;

            return (
              <div className="date-group" key={dateKey}>
                <h2 className="text-xl font-semibold my-4 border-b border-gray-300 pb-2 dark:border-gray-700">
                  {dateKey}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {eventsForThisDate.map(e => {
                    const eventTitle = e.Title || 'Untitled Event';
                    const displayTime = e.Time || '';
                    const displayLocation = `${e.City || ''}, ${e.State || ''}`.replace(/,\s*$/, '');
                    const localFileName = e.localImagePath ? e.localImagePath.split('/').pop() : null;
                    const localThumbnail = e.localThumbnailPath ? e.localThumbnailPath.split('/').pop() : null;

                    // Prepare copy strings
                    const plainText = [
                      eventTitle,
                      `${dateKey} ${displayTime}`,
                      displayLocation,
                      e.Address || '',
                      e.Links || '',
                      e.Sponsors || ''
                    ].join('\n');

                    const htmlData = `<strong>${eventTitle}</strong><br>` +
                      `${dateKey} ${displayTime}<br>` +
                      `${displayLocation}<br>` +
                      `${e.Address || ''}<br>` +
                      `${e.Links || ''}<br>` +
                      `${e.Sponsors || ''}<br>`;

                    const markdownData = `**${eventTitle}**\n` +
                      `${dateKey} ${displayTime}\n` +
                      `${displayLocation}\n` +
                      `${e.Address || ''}\n` +
                      `${e.Links || ''}\n` +
                      `${e.Sponsors || ''}\n`;

                    function escapeAttr(str = '') {
                      return str
                        .replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/\n/g, '\\n');
                    }

                    return (
                      <div
                        className="event-card border border-gray-200 dark:border-gray-700 rounded overflow-hidden shadow-sm dark:shadow-none flex flex-col"
                        data-state={e.State || ''}
                        data-date={dateKey}
                        key={e.UUID}
                      >
                        {localFileName && (
                          <div className="relative">
                            <a
                              href={`assets/images/${localFileName}`}
                              data-title={escapeAttr(eventTitle)}
                            >
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
                            <p className="text-sm mb-1"><strong>Address:</strong> {e.Address || ''}</p>
                            <p className="text-sm mb-1"><strong>Meeting Location:</strong> {e["Meeting Location"] || ''}</p>
                            <p className="text-sm mb-1"><strong>Description:</strong> {e.Description || ''}</p>
                            <p className="text-sm mb-1"><strong>Links:</strong> {e.Links || ''}</p>
                            <p className="text-sm mb-2"><strong>Sponsors:</strong> {e.Sponsors || ''}</p>
                          </div>

                          <div className="mt-2">
                            <a
                              href={`events/${e.UUID}.html`}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-sm"
                            >
                              Details Page
                            </a>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              className="copy-btn inline-block px-3 py-1 text-sm border border-gray-300 rounded
                                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer
                                         copy-plain"
                              data-plain={escapeAttr(plainText)}
                            >
                              Copy Plain
                            </button>

                            <button
                              className="copy-btn inline-block px-3 py-1 text-sm border border-gray-300 rounded
                                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer
                                         copy-rich"
                              data-plain={escapeAttr(plainText)}
                              data-html={escapeAttr(htmlData)}
                            >
                              Copy Rich
                            </button>

                            <button
                              className="copy-btn inline-block px-3 py-1 text-sm border border-gray-300 rounded
                                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer
                                         copy-md"
                              data-md={escapeAttr(markdownData)}
                            >
                              Copy MD
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div id="noEventsMessage" className="hidden text-gray-500 dark:text-gray-400 mt-4 italic"></div>

        {/* Scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const filterSelect = document.getElementById('stateFilter');
              const dateSelect = document.getElementById('dateFilter');
              const eventCards = document.querySelectorAll('.event-card');
              const noEventsMsg = document.getElementById('noEventsMessage');

              filterSelect.addEventListener('change', () => {
                updateURLParam('state', filterSelect.value === 'ALL' ? '' : filterSelect.value);
                applyFilters();
              });

              dateSelect.addEventListener('change', () => {
                updateURLParam('date', dateSelect.value === 'ALL' ? '' : dateSelect.value);
                applyFilters();
              });

              const urlParams = new URLSearchParams(window.location.search);
              const initialState = urlParams.get('state') || 'ALL';
              const initialDate = urlParams.get('date') || 'ALL';
              filterSelect.value = initialState;
              dateSelect.value = initialDate;
              applyFilters();

              function applyFilters() {
                const stateValue = filterSelect.value;
                const dateValue = dateSelect.value;
                let visibleCount = 0;

                eventCards.forEach(card => {
                  const eventState = card.getAttribute('data-state');
                  // In real usage, we'd also filter by dateValue.
                  const matchesState = (stateValue === 'ALL' || eventState === stateValue);
                  const matchesDate = true; // placeholder

                  if (matchesState && matchesDate) {
                    card.style.display = 'block';
                    visibleCount++;
                  } else {
                    card.style.display = 'none';
                  }
                });

                if (visibleCount === 0 && (stateValue !== 'ALL' || dateValue !== 'ALL')) {
                  noEventsMsg.textContent = 'No matching events';
                  noEventsMsg.classList.remove('hidden');
                } else {
                  noEventsMsg.classList.add('hidden');
                }
              }

              function updateURLParam(key, value) {
                const sp = new URLSearchParams(window.location.search);
                if (value) {
                  sp.set(key, value);
                } else {
                  sp.delete(key);
                }
                const newUrl = window.location.pathname + (sp.toString() ? '?' + sp.toString() : '');
                window.history.replaceState({}, '', newUrl);
              }

              // Copy-to-clipboard
              document.querySelectorAll('.copy-plain').forEach(btn => {
                btn.addEventListener('click', () => {
                  const text = btn.getAttribute('data-plain');
                  navigator.clipboard.writeText(text)
                    .then(() => alert('Copied plain text!'))
                    .catch(err => console.error('Failed to copy plain text', err));
                });
              });

              document.querySelectorAll('.copy-rich').forEach(btn => {
                btn.addEventListener('click', () => {
                  const plain = btn.getAttribute('data-plain');
                  const html = btn.getAttribute('data-html');
                  const blobPlain = new Blob([plain], { type: 'text/plain' });
                  const blobHtml = new Blob([html], { type: 'text/html' });
                  const clipboardItem = new ClipboardItem({
                    'text/plain': blobPlain,
                    'text/html': blobHtml
                  });
                  navigator.clipboard.write([clipboardItem])
                    .then(() => alert('Copied as rich text!'))
                    .catch(err => console.error('Failed to copy rich text', err));
                });
              });

              document.querySelectorAll('.copy-md').forEach(btn => {
                btn.addEventListener('click', () => {
                  const md = btn.getAttribute('data-md');
                  navigator.clipboard.writeText(md)
                    .then(() => alert('Copied markdown!'))
                    .catch(err => console.error('Failed to copy markdown', err));
                });
              });
            `
          }}
        />
      </body>
    </html>
  );
}
