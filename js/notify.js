// Gathering reminders: asks permission, subscribes this device, and tells the reminder server which gatherings to remind about.
import { getLanguage } from "./i18n.js";

const API = "https://cisuw-push.christiansinseattle.workers.dev";
const KEY = "cis-uw-reminder-kinds";
const KINDS = [
  ["reading-zh", { en: "Chinese Bible Study", zh: "中文查经" }],
  ["reading-en", { en: "English Bible Study", zh: "英文查经" }],
  ["fellowship", { en: "Friday Family Gathering", zh: "周五家庭聚会" }],
  ["worship", { en: "Sunday Gathering", zh: "主日聚会" }],
  ["hike", { en: "Saturday Hike", zh: "周六爬山" }]
];
const TEXT = {
  en: {
    title: "Get a reminder before each gathering",
    intro: "We'll send a notification 45 minutes before the gatherings you choose. Notifications use your phone's language.",
    kinds: "Remind me about",
    on: "Turn on reminders", off: "Turn off reminders",
    working: "Working…",
    done: "Reminders are on for this device.",
    gone: "Reminders are off.",
    denied: "Notifications are blocked. Turn them on for this site in your phone's Settings, then try again.",
    iosInstall: "On iPhone, reminders work after you add the site to your home screen and open it from there.",
    guide: "See how to add it",
    unsupported: "This browser can't show reminders. Try Chrome on Android, or Safari on iPhone with the site added to your home screen.",
    failed: "Something went wrong. Please try again in a moment."
  },
  zh: {
    title: "每次聚会前收到提醒",
    intro: "在你选的聚会开始前 45 分钟，我们会发一条通知。通知语言跟随你手机的语言。",
    kinds: "提醒我这些聚会",
    on: "开启提醒", off: "关闭提醒",
    working: "处理中…",
    done: "这台设备的提醒已开启。",
    gone: "提醒已关闭。",
    denied: "通知被禁用了。请到手机“设置”里为本网站打开通知，再试一次。",
    iosInstall: "iPhone 上，需要先把网站添加到主屏幕，并从桌面图标打开，才能开启提醒。",
    guide: "查看添加教程",
    unsupported: "这个浏览器不支持提醒。请用安卓的 Chrome，或把网站添加到 iPhone 主屏幕后用 Safari 打开。",
    failed: "出错了，请稍后再试。"
  }
};

const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const loc = (v, l) => v[l] || v.en;
const deviceLang = () => ((navigator.languages && navigator.languages[0]) || navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en";

function savedKinds() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v)) return v; } catch (e) { /* default */ }
  return KINDS.map((k) => k[0]);
}
function saveKinds(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* ignore */ } }

function urlBase64ToUint8Array(s) {
  const p = (s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(p);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSub() {
  if (!supported) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function post(path, body) {
  const r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("http " + r.status);
  return r.json();
}

async function turnOn(kinds) {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { publicKey } = await (await fetch(API + "/vapid-public")).json();
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  }
  await post("/subscribe", { subscription: sub.toJSON(), lang: deviceLang(), kinds });
  return "ok";
}

async function turnOff() {
  const sub = await currentSub();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await post("/unsubscribe", { endpoint }).catch(() => {});
  }
}

async function render() {
  const root = document.getElementById("reminders-body");
  if (!root) return;
  const lang = getLanguage(), T = TEXT[lang];
  document.getElementById("rem-title").textContent = T.title;
  const status = (msg) => { const s = document.getElementById("rem-status"); if (s) s.textContent = msg || ""; };

  if (isIOS && !standalone) {
    root.innerHTML = `<p>${T.iosInstall}</p><p><a class="button button-dark" href="install.html">${T.guide}</a></p><p id="rem-status" role="status" aria-live="polite"></p>`;
    return;
  }
  if (!supported) { root.innerHTML = `<p>${T.unsupported}</p>`; return; }

  const sub = await currentSub().catch(() => null);
  const on = Boolean(sub) && Notification.permission === "granted";
  const chosen = savedKinds();
  root.innerHTML = `
    <p>${T.intro}</p>
    <fieldset class="rem-kinds"><legend>${T.kinds}</legend>
      ${KINDS.map(([id, name]) => `<label><input type="checkbox" id="rk-${id}" value="${id}" ${chosen.includes(id) ? "checked" : ""}> <span>${loc(name, lang)}</span></label>`).join("")}
    </fieldset>
    <p><button type="button" class="button ${on ? "button-dark" : "button-primary"}" id="rem-toggle">${on ? T.off : T.on}</button></p>
    <p id="rem-status" role="status" aria-live="polite">${on ? T.done : ""}</p>`;

  const read = () => [...root.querySelectorAll("input[type=checkbox]:checked")].map((i) => i.value);
  root.querySelectorAll("input[type=checkbox]").forEach((box) => box.addEventListener("change", async () => {
    saveKinds(read());
    if (on) { try { await post("/subscribe", { subscription: sub.toJSON(), lang: deviceLang(), kinds: read() }); status(T.done); } catch (e) { status(T.failed); } }
  }));
  const btn = document.getElementById("rem-toggle");
  btn.addEventListener("click", async () => {
    btn.disabled = true; status(T.working);
    try {
      if (on) { await turnOff(); await render(); status(T.gone); return; }
      saveKinds(read());
      const res = await turnOn(read());
      if (res === "denied") { btn.disabled = false; status(T.denied); return; }
      await render();
    } catch (e) { btn.disabled = false; status(T.failed); }
  });
}

render();
window.addEventListener("languagechange", render);
