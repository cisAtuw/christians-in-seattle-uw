import { siteData } from "../data/site.js";
import { applyDocumentLanguage, getLanguage, t, toggleLanguage } from "./i18n.js";

const navigation = [
  ["nav.home", "index.html"],
  ["nav.about", "about.html"],
  ["nav.events", "events.html"],
  ["nav.bibleStudy", "bible-study.html"],
  ["nav.contact", "contact.html"],
];

function currentFile() {
  return location.pathname.split("/").pop() || "index.html";
}

function externalLink(url, label, className = "text-link") {
  if (!url) return "";
  return `<a class="${className}" href="${url}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only"> (${t("common.external")})</span></a>`;
}

function renderNavigation() {
  const target = document.querySelector("#site-header");
  if (!target) return;
  const links = navigation.map(([key, href]) => {
    const active = currentFile() === href;
    return `<a class="nav-link${active ? " is-active" : ""}" href="${href}"${active ? ' aria-current="page"' : ""}>${t(key)}</a>`;
  }).join("");

  target.innerHTML = `
    <header class="site-header">
      <div class="nav-shell">
        <a class="brand" href="index.html" aria-label="${siteData.organizationName}">
          <img class="brand-logo" src="${siteData.logoImage}" alt="">
          <span><strong>${getLanguage() === "zh" ? siteData.organizationNameZh : siteData.organizationName}</strong><small>${t("common.rso")}</small></span>
        </a>
        <button class="icon-button menu-button" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Toggle navigation">
          <span></span><span></span><span></span>
        </button>
        <nav id="primary-nav" class="primary-nav" aria-label="Primary navigation">${links}</nav>
        <button class="language-button" type="button">${getLanguage() === "en" ? "中文" : "EN"}</button>
      </div>
    </header>`;

  const menuButton = target.querySelector(".menu-button");
  const nav = target.querySelector(".primary-nav");
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
  });
  target.querySelector(".language-button").addEventListener("click", toggleLanguage);
}

function renderFooter() {
  const target = document.querySelector("#site-footer");
  if (!target) return;
  const social = [
    externalLink(siteData.instagramUrl, t("common.instagram")),
    externalLink(siteData.discordInviteUrl, t("common.discord")),
    externalLink(siteData.campusGroupsUrl, t("common.campusGroups")),
    externalLink(siteData.churchWebsiteUrl, t("common.church")),
  ].filter(Boolean).join("");

  target.innerHTML = `
    <footer class="site-footer">
      <div class="footer-shell">
        <div>
          <strong>${getLanguage() === "zh" ? siteData.organizationNameZh : siteData.organizationName}</strong>
          <p>${t("common.studentLed")}</p>
        </div>
        <nav class="footer-links" aria-label="Footer">${social}</nav>
        <p class="footer-date">${t("common.lastUpdated")}: <time datetime="${siteData.lastUpdated}">${siteData.lastUpdated}</time></p>
      </div>
    </footer>`;
}

function renderConfigLinks() {
  document.querySelectorAll("[data-link]").forEach((element) => {
    const url = siteData[element.dataset.link];
    if (!url) {
      element.hidden = true;
      return;
    }
    element.href = url;
    element.target = "_blank";
    element.rel = "noopener noreferrer";
  });
}

function renderGoogleCalendarLinks() {
  const calendarUrl = new URL("calendar/fall-2026-orientation.ics", document.baseURI).href;
  const subscribeUrl = `https://calendar.google.com/calendar/r?cid=${calendarUrl.replace(/^https?:/, "webcal:")}`;
  document.querySelectorAll("[data-google-calendar-all]").forEach((element) => {
    element.href = subscribeUrl;
    element.target = "_blank";
    element.rel = "noopener noreferrer";
    element.removeAttribute("download");
  });
}

function renderSocialPreviews() {
  document.querySelectorAll("a[data-social-preview]").forEach((link, index) => {
    const type = link.dataset.socialPreview;
    let wrapper = link.closest(".social-preview");
    if (!wrapper) {
      wrapper = document.createElement("span");
      wrapper.className = "social-preview";
      link.before(wrapper);
      wrapper.append(link);
    }

    let card = wrapper.querySelector(".social-preview-card");
    if (!card) {
      card = document.createElement("span");
      card.className = "social-preview-card";
      card.setAttribute("role", "tooltip");
      wrapper.append(card);
    }

    const cardId = `social-preview-${type}-${index}`;
    card.id = cardId;
    link.setAttribute("aria-describedby", cardId);
    const isChinese = getLanguage() === "zh";

    const text = (en, zh) => (isChinese ? zh : en);
    const cards = {
      discord: { image: siteData.socialCommunityImage, title: "Christians in Seattle UW", text: text("Events, questions, Bible verses, and campus fellowship", "活动通知、问题、经文与校园交通"), extra: `<a href="${siteData.discordChannelUrl}" target="_blank" rel="noopener noreferrer">${text("Preview #general", "预览 #general")} &rarr;</a>` },
      instagram: { image: siteData.instagramPreviewImage, title: `@${siteData.instagramUsername}`, text: text("Recent events, campus photos, and Bible verse posts", "查看最新活动、校园照片与经文分享") },
      schedule: { image: siteData.scheduleImagePreview, title: text("Weekly Gatherings", "每周聚会"), text: text("Friday family dinners, Saturday hikes, and Bible study", "周五家庭聚会、周六爬山和查经") },
      events: { image: siteData.eventsPreviewImage, title: text("Past Adventures", "过往活动"), text: text("Day trips, hikes, and dinners with friends", "一日游、爬山和朋友聚餐") },
      bible: { image: siteData.biblePreviewImage, title: text("Bible Study", "查经"), text: text("Read, ask questions, and sing together", "一起读经、提问、唱诗") },
      church: { image: siteData.churchPreviewImage, title: text("The Church Family", "教会大家庭"), text: text("Meet the wider community we belong to", "认识我们所属的更大群体") },
      calendar: { image: siteData.calendarPreviewImage, title: text("Never Miss a Week", "不错过每一周"), text: text("Add every gathering to your calendar", "把每次聚会加入你的日历") },
    };
    const c = cards[type] || cards.instagram;
    card.innerHTML = `
      <img data-src="${c.image}" alt="" width="88" height="88">
      <span class="social-preview-copy">
        <strong>${c.title}</strong>
        <small>${c.text}</small>
        ${c.extra || ""}
      </span>`;
    if (!wrapper.dataset.previewBound) {
      wrapper.dataset.previewBound = "1";
      const load = () => {
        const img = card.querySelector("img[data-src]");
        if (img) { img.src = img.dataset.src; img.removeAttribute("data-src"); }
      };
      ["mouseenter", "focusin", "touchstart"].forEach((name) => wrapper.addEventListener(name, load, { passive: true }));
    }
  });
}

function renderConfiguredContent() {
  document.querySelectorAll("[data-public-name]").forEach((element) => {
    element.textContent = getLanguage() === "zh" ? siteData.organizationNameZh : siteData.organizationName;
  });
  document.querySelectorAll("[data-organization-type]").forEach((element) => {
    element.textContent = siteData.organizationType[getLanguage()];
  });
  document.querySelectorAll("[data-weekly-time]").forEach((element) => {
    element.textContent = siteData.weeklyTime[getLanguage()];
  });
  document.querySelectorAll("[data-weekly-location]").forEach((element) => {
    element.textContent = siteData.weeklyLocation[getLanguage()];
  });
  document.querySelectorAll("[data-contact-email]").forEach((element) => {
    if (!siteData.contactEmail) {
      element.hidden = true;
      return;
    }
    element.href = `mailto:${siteData.contactEmail}`;
    element.textContent = siteData.contactEmail;
  });
  document.querySelectorAll("[data-contact-phones]").forEach((element) => {
    const phones = siteData.contactPhones || [];
    element.hidden = !phones.length;
    element.innerHTML = phones
      .map((person) => `<a href="tel:${person.phone.replace(/[^0-9+]/g, "")}"><span>${person.name} · ${person.phone}</span><span aria-hidden="true">☎</span></a>`)
      .join("");
  });
  document.querySelectorAll("[data-instagram-username]").forEach((element) => {
    element.textContent = `@${siteData.instagramUsername}`;
  });
  document.querySelectorAll("[data-config-image]").forEach((element) => {
    const source = siteData[element.dataset.configImage];
    if (!source) {
      element.hidden = true;
      return;
    }
    element.src = source;
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    element.alt = t(element.dataset.i18nAlt);
  });
  document.querySelectorAll("[data-discord-unavailable]").forEach((element) => {
    element.hidden = Boolean(siteData.discordInviteUrl);
  });
}

function installImageFallbacks() {
  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => {
      const placeholder = document.createElement("div");
      placeholder.className = "media-placeholder";
      placeholder.setAttribute("role", "img");
      placeholder.setAttribute("aria-label", image.alt || "Image coming soon");
      image.replaceWith(placeholder);
    }, { once: true });
  });
}

function renderShared() {
  applyDocumentLanguage();
  renderNavigation();
  renderFooter();
  renderConfigLinks();
  renderGoogleCalendarLinks();
  renderConfiguredContent();
  renderSocialPreviews();
  installImageFallbacks();
}

document.addEventListener("DOMContentLoaded", renderShared);
window.addEventListener("languagechange", renderShared);

export { siteData, t, getLanguage, externalLink };
