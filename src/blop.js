import { parseEventDate } from "./tasks/parseDates";
import { titleCase } from "title-case";
import { humanizeDate } from "./tasks/parseDates";
import { normalizeState } from "./geo";

export class Blop {
  constructor({ events = [] }) {
    this.events = events;
  }

  to_json() {
    return JSON.stringify(this.events, null, 2);
  }

  static from_rows(rows) {
    let events = rows.map(row => {
      const localThumbnail = row.localThumbnailPath ? row.localThumbnailPath.split('/').pop() : null;
      const localImage = row.localImagePath ? row.localImagePath.split('/').pop() : null
      const event = {
        "id": row.UUID,
        "title": titleCase(row.Title),
        "date": humanizeDate(row.Date),
        "time": row.Time,
        "description": row.Description,
        "city": row.City,
        "state": normalizeState(row.State),
        "address": row.Address,
        "meeting_location": row["Meeting Location"],
        "links": row.Links.split(",").filter(n => n),
        "sponsors": row.Sponsors.trim().split(",").filter(n => n),
        "image_url": `https://theblop.org/assets/images/${localImage}`,
        "thumbnail_url": `https://theblop.org/assets/images/${localThumbnail}`,
        "canonical_id": row["Canonical UUID"],
        "permalink": `https://theblop.org/events/${row.UUID}.html`,
        "ical": `https://theblop.org/assets/ical/${row.UUID}.ics`,
        "raw_text": row.RawText,
        "raw_description": row.RawDescription,
      };
      return event;
    });
    events.sort(Blop.sort_by_date);
    return new Blop({ events });
  }

  static sort_by_date(a, b) {
    const da = parseEventDate(a.Date);
    const db = parseEventDate(b.Date);
    if (!da) return 1;
    if (!db) return -1;
    return da.valueOf() - db.valueOf();
  }
}