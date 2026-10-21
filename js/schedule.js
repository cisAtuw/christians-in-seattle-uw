import { fallOrientationEvents, weeklyEvents, weeklySchedule } from "../data/events.js";
import { siteData } from "../data/site.js";
import { getLanguage, localized, t } from "./i18n.js";

const timezone = "America/Los_Angeles";

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(value, count) {
  const date = parseDate(value);
  date.setDate(date.getDate() + count);
  return date.toISOString().slice(0, 10);
}

function compactDate(value) {
  return value.replaceAll("-", "");
}

function compactDateTime(date, time) {
  return `${compactDate(date)}T${time.replace(":", "")}00`;
}

function formatDate(event) {
  const locale = getLanguage() === "zh" ? "zh-CN" : "en-US";
  const options = { weekday: "short", month: "short", day: "numeric" };
  const start = parseDate(event.date).toLocaleDateString(locale, options);
  if (!event.endDate || event.endDate === event.date) return start;
  const end = parseDate(event.endDate).toLocaleDateString(locale, options);
  return `${start} – ${end}`;
}

function timeLabel(event) {
  return event.time && localized(event.time) ? localized(event.time) : t("common.timeTbc");
}

function locationLabel(event) {
  if (event.confirmed.location && event.location) return localized(event.location);
  if (event.location && localized(event.location)) {
    return `${localized(event.location)} (${t("common.pendingConfirmation")})`;
  }
  if (event.confirmed.building && event.building) {
    return `${localized(event.building)} — ${t("common.roomTbc")}`;
  }
  return t("common.locationTbc");
}

function hasUnconfirmedDetails(event) {
  return !event.confirmed.date || !event.confirmed.time || !event.confirmed.location;
}

function temporalStatus(event) {
  if (event.cancelled) return "cancelled";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDate(event.date);
  const end = parseDate(event.endDate || event.date);
  if (today >= start && today <= end) return "today";
  return end < today ? "past" : "upcoming";
}

function statusBadges(event) {
  const status = temporalStatus(event);
  if (status === "cancelled") {
    return `<span class="status-badge status-cancelled">${t("status.cancelled")}</span>`;
  }
  const confirmation = hasUnconfirmedDetails(event)
    ? `<span class="status-badge status-tbc">${t("status.tbc")}</span>`
    : "";
  return `<span class="status-badge status-${status}">${t(`status.${status}`)}</span>${confirmation}`;
}

function bilingualDescription(event) {
  const time = event.time && event.time.en
    ? `${event.time.en} / ${event.time.zh}`
    : "Time to be confirmed / 时间待确认";
  const location = event.confirmed.location
    ? `${event.location.en} / ${event.location.zh}`
    : event.location && event.location.en
      ? `${event.location.en} (pending confirmation) / ${event.location.zh}（待确认）`
      : event.confirmed.building
        ? `${event.building.en} — room to be confirmed / ${event.building.zh} — 教室待确认`
        : "UW Seattle campus — room to be confirmed / UW 西雅图校区 — 教室待确认";
  const lines = [
    `${event.title.en} / ${event.title.zh}`,
    `${event.description.en} / ${event.description.zh}`,
    time,
    location,
    "Please check Instagram for the latest updates. / 请关注 Instagram 获取最新安排。",
  ].filter(Boolean);
  return lines.join("\n");
}

function googleCalendarUrl(event) {
  const dates = event.startTime && event.endTime
    ? `${compactDateTime(event.date, event.startTime)}/${compactDateTime(event.date, event.endTime)}`
    : `${compactDate(event.date)}/${compactDate(addDays(event.endDate || event.date, 1))}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: localized(event.title),
    dates,
    ctz: timezone,
    details: bilingualDescription(event),
    location: locationLabel(event),
    sprop: `website:https://${siteData.primaryDomain}/events.html`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function calendarActions(event) {
  if (event.cancelled || temporalStatus(event) === "past") return "";
  return `
    <div class="calendar-actions">
      <a class="calendar-link" href="${googleCalendarUrl(event)}" target="_blank" rel="noopener noreferrer">${t("common.addGoogle")}</a>
    </div>`;
}

function photoGallery(event) {
  if (!event.images || !event.images.length) return "";
  const figures = event.images
    .map(
      (image) => `
        <figure class="event-photo">
          <img src="${image.src}" alt="${localized(image.alt) || localized(event.title)}" loading="lazy">
        </figure>`
    )
    .join("");
  return `<div class="event-photo-gallery">${figures}</div>`;
}

export function eventCard(event, options = {}) {
  const nearestClass = options.isNext ? " is-next" : "";
  return `
    <article id="event-${event.id}" class="event-card${nearestClass}">
      <div class="event-card-top">
        <p class="event-date">${formatDate(event)}</p>
        <div class="status-row">${statusBadges(event)}</div>
      </div>
      <h3>${localized(event.title)}</h3>
      <p>${localized(event.description)}</p>
      ${photoGallery(event)}
      ${temporalStatus(event) === "past"
        ? ""
        : `<dl class="event-details">
        <div><dt>${t("common.time")}</dt><dd>${event.cancelled ? t("status.cancelled") : timeLabel(event)}</dd></div>
        <div><dt>${t("common.location")}</dt><dd>${event.cancelled ? t("common.notApplicable") : locationLabel(event)}</dd></div>
        <div><dt>${t("common.audience")}</dt><dd>${localized(event.audience)}</dd></div>
      </dl>`}
      ${calendarActions(event)}
    </article>`;
}

function nextEventId(events) {
  const upcoming = events
    .filter((event) => !event.cancelled && temporalStatus(event) === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0]?.id || "";
}

export function renderSchedule(container, events = fallOrientationEvents) {
  if (!container) return;
  const publicEvents = events.filter((event) => event.public !== false);
  const nextId = nextEventId(publicEvents);
  container.innerHTML = publicEvents
    .map((event) => eventCard(event, { isNext: event.id === nextId }))
    .join("");
}

export function splitEvents(events = fallOrientationEvents) {
  return events.reduce((groups, event) => {
    if (event.cancelled) {
      groups.cancelled.push(event);
      return groups;
    }
    const status = temporalStatus(event);
    const target = status === "past" ? "past" : "upcoming";
    groups[target].push(event);
    return groups;
  }, { upcoming: [], past: [], cancelled: [] });
}

export function bindSchedule(container, events = fallOrientationEvents) {
  const render = () => renderSchedule(container, events);
  render();
  window.addEventListener("languagechange", render);
}

export function weeklyCard(event) {
  return `
    <article id="event-${event.id}" class="event-card">
      <div class="event-card-top">
        <p class="event-date">${localized(event.day)}</p>
        <div class="status-row"><span class="status-badge status-upcoming">${t("common.weekly")}</span></div>
      </div>
      <h3>${localized(event.title)}</h3>
      <p>${localized(event.description)}</p>
      <dl class="event-details">
        <div><dt>${t("common.time")}</dt><dd>${localized(event.time)}</dd></div>
        <div><dt>${t("common.location")}</dt><dd>${localized(event.location)}</dd></div>
        <div><dt>${t("common.audience")}</dt><dd>${localized(event.audience)}</dd></div>
      </dl>
    </article>`;
}

export function renderWeekly(container, events = weeklyEvents) {
  if (!container) return;
  container.innerHTML = events.map(weeklyCard).join("");
}

const TT_START = 11 * 60;
const TT_END = 19 * 60 + 30;
const TT_DAYS = [
  { d: 2, en: "Tue", zh: "周二" },
  { d: 3, en: "Wed", zh: "周三" },
  { d: 4, en: "Thu", zh: "周四" },
  { d: 5, en: "Fri", zh: "周五" },
  { d: 6, en: "Sat", zh: "周六" },
  { d: 0, en: "Sun", zh: "周日" },
];

function toMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function clock(value) {
  const [h, m] = value.split(":").map(Number);
  const mm = String(m).padStart(2, "0");
  if (getLanguage() === "zh") return `${h}:${mm}`;
  return `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
}

function slotTime(slot) {
  if (slot.timeNote) return localized(slot.timeNote);
  const a = clock(slot.start), b = clock(slot.end);
  const [a1, a2] = a.split(" "), [, b2] = b.split(" ");
  return a2 && a2 === b2 ? `${a1}–${b}` : `${a}–${b}`;
}

function slotInner(slot) {
  return `<span class="tt-time">${slotTime(slot)}</span><strong>${localized(slot.title)}</strong><small>${localized(slot.place)}</small>`;
}

function timetableHtml() {
  const rows = (TT_END - TT_START) / 30;
  const zh = getLanguage() === "zh";
  const head = TT_DAYS.map((day, i) => `<div class="tt-head" style="grid-column:${i + 2};grid-row:1">${zh ? day.zh : day.en}</div>`).join("");
  const cols = TT_DAYS.map((day, i) => `<div class="tt-col" style="grid-column:${i + 2};grid-row:2 / ${rows + 2}"></div>`).join("");
  let hours = "";
  for (let m = TT_START; m < TT_END; m += 60) {
    const row = (m - TT_START) / 30 + 2;
    hours += `<div class="tt-hour" style="grid-row:${row} / span 2">${clock(`${m / 60}:00`)}</div>`;
  }
  const events = weeklySchedule.map((slot) => {
    const col = TT_DAYS.findIndex((day) => day.d === slot.day) + 2;
    const r1 = (toMinutes(slot.start) - TT_START) / 30 + 2;
    const r2 = (toMinutes(slot.end) - TT_START) / 30 + 2;
    return `<div class="tt-event tt-${slot.kind}" style="grid-column:${col};grid-row:${r1} / ${r2}">${slotInner(slot)}</div>`;
  }).join("");
  const agenda = TT_DAYS.map((day) => {
    const items = weeklySchedule
      .filter((slot) => slot.day === day.d)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((slot) => `<li class="tt-item tt-${slot.kind}">${slotInner(slot)}</li>`)
      .join("");
    return `<div class="tt-day"><h3>${zh ? day.zh : day.en}</h3><ul>${items}</ul></div>`;
  }).join("");
  return `
    <div class="timetable" aria-hidden="true">${head}${hours}${cols}${events}</div>
    <div class="tt-agenda">${agenda}</div>`;
}

function timetableBlock() {
  const notes = weeklyEvents
    .map((event) => `<li><strong>${localized(event.title)}</strong> — ${localized(event.description)}</li>`)
    .join("");
  return `
    <div class="timetable-wrap">
      ${timetableHtml()}
      <ul class="tt-notes">${notes}</ul>
      <div class="tt-join">
        <h3>${t("pages.joinTitle")}</h3>
        <p>${t("pages.joinBody1")}</p>
        <p>${t("pages.joinBody2")}</p>
        <p class="tt-join-links"><a href="index.html#interest">${t("pages.joinInterest")} →</a><a href="contact.html">${t("nav.contact")} →</a><a href="bible-study.html">${t("pages.bibleLink")} →</a><a href="calendar/fall-2026-orientation.ics" download>${t("pages.icsDownload")}</a></p>
      </div>
    </div>`;
}

export function renderUpcoming(container, upcoming = []) {
  if (!container) return;
  container.innerHTML = [
    timetableBlock(),
    ...upcoming.filter((e) => e.public !== false).map((e) => eventCard(e)),
  ].join("");
}
