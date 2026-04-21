// api/calendar.ics.js
// GET /api/calendar.ics?key=YOUR_SHORTCUT_API_KEY
// iPhone subscribes to this URL → events appear in native Calendar app
// Refreshes automatically every hour on iPhone

import { getEvents } from "../lib/store.js";

export default async function handler(req, res) {
  // Auth via query param (easier for calendar subscriptions)
  if (req.query.key !== process.env.SHORTCUT_API_KEY) {
    return res.status(401).end("Unauthorized");
  }

  const events = await getEvents();
  const now = new Date();
  const stamp = formatDate(now);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HQ Assistant//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:HQ Agenda",
    "X-WR-TIMEZONE:America/Toronto",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const ev of events) {
    const uid = `${ev.id}@hq-assistant`;
    const dtstart = eventDate(ev.date, ev.time);
    const dtend = eventDateEnd(ev.date, ev.time, ev.duration);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART${ev.time ? "" : ";VALUE=DATE"}:${dtstart}`);
    lines.push(`DTEND${ev.time ? "" : ";VALUE=DATE"}:${dtend}`);
    lines.push(`SUMMARY:${escIcal(ev.title)}`);
    if (ev.notes) lines.push(`DESCRIPTION:${escIcal(ev.notes)}`);
    lines.push(`CATEGORIES:${ev.type?.toUpperCase() || "OTHER"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", "inline; filename=hq.ics");
  res.setHeader("Cache-Control", "no-cache");
  res.send(lines.join("\r\n"));
}

function formatDate(d) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function eventDate(date, time) {
  if (!time) return date.replace(/-/g, "");
  const [h, m] = time.split(":");
  const d = new Date(`${date}T${h.padStart(2,"0")}:${m.padStart(2,"0")}:00`);
  return formatDate(d);
}

function eventDateEnd(date, time, duration) {
  if (!time) {
    // All-day: end = next day
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0].replace(/-/g, "");
  }
  const [h, m] = time.split(":");
  const start = new Date(`${date}T${h.padStart(2,"0")}:${m.padStart(2,"0")}:00`);
  let mins = 60; // default 1h
  if (duration) {
    const match = duration.match(/(\d+)h/);
    const matchM = duration.match(/(\d+)m/);
    if (match) mins = parseInt(match[1]) * 60;
    if (matchM) mins += parseInt(matchM[1]);
  }
  start.setMinutes(start.getMinutes() + mins);
  return formatDate(start);
}

function escIcal(str) {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
