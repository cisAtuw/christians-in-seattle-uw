import { translations } from "../data/i18n.js";

const STORAGE_KEY = "cis-uw-language";
const supported = ["en", "zh"];

export function getLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return supported.includes(saved) ? saved : "en";
}

export function t(path) {
  return path.split(".").reduce((value, key) => value?.[key], translations[getLanguage()]) ?? path;
}

export function localized(value) {
  if (!value || typeof value !== "object") return value ?? "";
  return value[getLanguage()] ?? value.en ?? "";
}

export function applyDocumentLanguage() {
  const language = getLanguage();
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
}

export function toggleLanguage() {
  const next = getLanguage() === "en" ? "zh" : "en";
  localStorage.setItem(STORAGE_KEY, next);
  applyDocumentLanguage();
  window.dispatchEvent(new CustomEvent("languagechange", { detail: { language: next } }));
}
