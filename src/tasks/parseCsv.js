/* src/tasks/parseCsv.js */
import Papa from 'papaparse';

export function parseCSV(csvString) {
  const results = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });
  if (results.errors && results.errors.length > 0) {
    console.warn('PapaParse warnings:', results.errors);
  }
  return results.data; // array of row objects
}
