// "Add to Home Screen" banner, plus the "something new" app badge.
import { getLanguage } from "./i18n.js";

const KEY = "cis-uw-install-dismissed";
const TEXT = {
  en: {
    title: "Add cisuw.com to your home screen",
    ios: "Tap ≡ next to the address bar, then Share, then Add to Home Screen.",
    android: "Install it to open the schedule in one tap.",
    wechat: "Open this page in Safari or Chrome to add it to your home screen.",
    guide: "See the guide", install: "Install", close: "Dismiss"
  },
  zh: {
    title: "把 cisuw.com 添加到手机桌面",
    ios: "点网址栏旁边的 ≡，再点“分享”，再点“添加到主屏幕”。",
    android: "安装后，一点就能打开聚会时间。",
    wechat: "请用 Safari 或 Chrome 打开本页，再添加到桌面。",
    guide: "查看教程", install: "安装", close: "关闭"
  }
};

const ua = navigator.userAgent;
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/i.test(ua);
const isWeChat = () => /MicroMessenger/i.test(ua);
const isMobile = () => matchMedia("(pointer: coarse)").matches && (isIOS() || isAndroid());

function dismissed() {
  try { const t = Number(localStorage.getItem(KEY)); return t && Date.now() - t < 14 * 864e5; } catch (e) { return false; }
}
function dismiss() {
  try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ }
  document.getElementById("install-banner")?.remove();
}

let deferred = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; render(); });
window.addEventListener("appinstalled", () => document.getElementById("install-banner")?.remove());

function render() {
  document.getElementById("install-banner")?.remove();
  if (isStandalone() || !isMobile() || dismissed()) return;
  if (/install\.html$/.test(location.pathname)) return;
  const T = TEXT[getLanguage()];
  let body;
  if (isWeChat()) body = `<p>${T.wechat}</p>`;
  else if (isAndroid() && deferred) body = `<p>${T.android}</p><div class="ib-actions"><button type="button" class="ib-btn" data-act="install">${T.install}</button></div>`;
  else body = `<p>${isIOS() ? T.ios : T.android}</p><div class="ib-actions"><a class="ib-btn" href="install.html">${T.guide}</a></div>`;
  const el = document.createElement("aside");
  el.id = "install-banner";
  el.setAttribute("role", "region");
  el.setAttribute("aria-label", T.title);
  el.innerHTML = `<div class="ib-text"><strong>${T.title}</strong>${body}</div><button type="button" class="ib-close" data-act="close" aria-label="${T.close}">×</button>`;
  el.addEventListener("click", async (ev) => {
    const act = ev.target.closest("[data-act]")?.dataset.act;
    if (act === "close") dismiss();
    if (act === "install" && deferred) { deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; dismiss(); }
  });
  document.body.append(el);
}

// ---- App badge: clear when opened, remember what the visitor has seen ----
async function dataHash() {
  const parts = await Promise.all(
    ["data/weekly-schedule.js", "data/events.js"].map((u) => fetch(u, { cache: "no-store" }).then((r) => r.text()))
  );
  let h = 0;
  for (const ch of parts.join("|")) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return String(h);
}

async function markSeen() {
  try {
    if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
    if (!("caches" in window)) return;
    const meta = await caches.open("cisuw-meta");
    await meta.put("seen-hash", new Response(await dataHash()));
    const reg = await navigator.serviceWorker?.ready;
    reg?.periodicSync?.register("check-updates", { minInterval: 12 * 3600 * 1000 }).catch(() => {});
  } catch (e) { /* offline or unsupported */ }
}

window.addEventListener("load", () => { setTimeout(render, 2500); markSeen(); });
window.addEventListener("languagechange", render);
