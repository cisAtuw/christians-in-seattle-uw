// Builds data/weekly-schedule.js from the club's public Google Calendar.
// Edit the calendar; this script (run by a GitHub Action) updates the website.
import { readFileSync, writeFileSync } from "node:fs";

const CAL_ID = "christiansinseattle@uw.edu";
const ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CAL_ID)}/public/basic.ics`;
const OUT = "data/weekly-schedule.js";
const TZ = "America/Los_Angeles";

// Chinese display text for common locations typed in English on the calendar.
const PLACE_ZH = { "Near campus": "校园附近", "Ask us for location": "地点请咨询" };

const DEFAULT_PLACE = {
  worship: { en: "Ask us for location", zh: "地点请咨询" },
  hike: { en: "Time/place TBD", zh: "时间地点待定" },
  fellowship: { en: "Near campus", zh: "校园附近" },
  other: { en: "Ask us for location", zh: "地点请咨询" },
};

export function unfold(text) {
  return text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
}

function unescapeText(s) {
  return s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

function parseDate(value, params) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", , z] = m;
  if (z) {
    const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(date).map((p) => [p.type, p.value])
    );
    return { y: +parts.year, mo: +parts.month, d: +parts.day, h: +parts.hour % 24, mi: +parts.minute };
  }
  return { y: +y, mo: +mo, d: +d, h: +h, mi: +mi };
}

const pad = (n) => String(n).padStart(2, "0");
const hhmm = (t) => `${pad(t.h)}:${pad(t.mi)}`;
const dow = (t) => new Date(Date.UTC(t.y, t.mo - 1, t.d)).getUTCDay();
const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function parseEvents(ics) {
  const events = [];
  let cur = null;
  for (const line of unfold(ics)) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const [name, ...paramParts] = line.slice(0, idx).split(";");
    cur[name.toUpperCase()] = { value: line.slice(idx + 1), params: paramParts.join(";") };
  }
  return events;
}

export function kindOf(summary) {
  const s = summary.toLowerCase();
  if (/chinese|中文/.test(s) && /bible|查经|读经/.test(s)) return "reading-zh";
  if (/english|英文/.test(s) && /bible|查经|读经/.test(s)) return "reading-en";
  if (/hike|爬山/.test(s)) return "hike";
  if (/sunday|主日|worship/.test(s)) return "worship";
  return "fellowship";
}

export function splitTitle(summary) {
  const i = summary.search(/[㐀-鿿]/);
  if (i < 0) return { en: summary.trim(), zh: summary.trim() };
  const en = summary.slice(0, i).trim();
  const zh = summary.slice(i).trim();
  return { en: en || zh, zh };
}

export function buildSlots(ics) {
  const slots = [];
  for (const ev of parseEvents(ics)) {
    if (ev["RECURRENCE-ID"] || !ev.RRULE || !/FREQ=WEEKLY/.test(ev.RRULE.value)) continue;
    if (ev.STATUS && /CANCELLED/i.test(ev.STATUS.value)) continue;
    if (!ev.SUMMARY || !ev.DTSTART || !ev.DTEND) continue;
    const start = parseDate(ev.DTSTART.value);
    const end = parseDate(ev.DTEND.value);
    if (!start || !end || ev.DTSTART.value.length === 8) continue;
    const by = (ev.RRULE.value.match(/BYDAY=([A-Z,]+)/) || [])[1];
    const days = by ? by.split(",").map((c) => DAY_CODES.indexOf(c.replace(/[+-]?\d+/, ""))).filter((d) => d >= 0) : [dow(start)];
    const summary = unescapeText(ev.SUMMARY.value);
    const kind = kindOf(summary);
    let place = DEFAULT_PLACE[kind] || DEFAULT_PLACE.other;
    const loc = ev.LOCATION ? unescapeText(ev.LOCATION.value) : "";
    if (loc && !/^[A-Za-z_]+\/[A-Za-z_]+$/.test(loc)) place = { en: loc, zh: PLACE_ZH[loc] || loc };
    const rawDesc = ev.DESCRIPTION
      ? ev.DESCRIPTION.value.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").replace(/<[^>]+>/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").trim()
      : "";
    for (const day of days) {
      const slot = { id: `${kind}-${day}-${hhmm(start).replace(":", "")}`, day, start: hhmm(start), end: hhmm(end), kind, title: splitTitle(summary), place };
      if (rawDesc) slot.desc = splitTitle(rawDesc);
      if (kind === "hike") {
        const h12 = (t) => `${t.h % 12 || 12}${t.mi ? ":" + pad(t.mi) : ""} ${t.h < 12 ? "AM" : "PM"}`;
        slot.timeNote = { en: `${h12(start)}–${h12(end)}`, zh: `${hhmm(start)}–${hhmm(end)}` };
      }
      slots.push(slot);
    }
  }
  slots.sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.start.localeCompare(b.start));
  return slots;
}

export function render(slots) {
  const rows = slots.map((s) => "  " + JSON.stringify(s)).join(",\n");
  return `// AUTO-GENERATED from the club Google Calendar by scripts/sync-calendar.mjs.\n// Do not edit by hand: change the calendar instead (day: 0 = Sunday ... 6 = Saturday).\nexport const weeklySchedule = [\n${rows},\n];\n`;
}

async function main() {
  const res = process.argv[2] ? { ok: true, text: async () => readFileSync(process.argv[2], "utf8") } : await fetch(ICS_URL);
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
  const slots = buildSlots(await res.text());
  if (slots.length === 0) { console.log("No recurring weekly events found; leaving schedule unchanged."); return; }
  const next = render(slots);
  let prev = "";
  try { prev = readFileSync(OUT, "utf8"); } catch {}
  if (prev === next) { console.log("Schedule unchanged."); return; }
  writeFileSync(OUT, next);
  console.log(`Wrote ${slots.length} slots to ${OUT}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
