/* src/tasks/fetchCsv.js */
import axios from 'axios';

export async function fetchCSV(url) {
  const response = await axios.get(url);
  return response.data; // CSV strings
}
