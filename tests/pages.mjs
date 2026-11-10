// The public pages every quality check covers. admin.html (token-protected) and 404.html are left out.
export const PAGES = [
  "/",
  "/about.html",
  "/events.html",
  "/bible-study.html",
  "/new-students.html",
  "/resources.html",
  "/fall-schedule.html",
  "/contact.html",
  "/install.html",
  "/offline.html",
];

export const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:4174";
