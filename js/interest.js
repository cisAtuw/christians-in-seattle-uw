import { siteData } from "../data/site.js";
import { getLanguage, t } from "./i18n.js";

const CONTACT_API = "https://cisuw-push.christiansinseattle.workers.dev/contact";

export function bindInterestForm(form) {
  if (!form) return;
  const status = form.querySelector("[data-form-status]");
  const button = form.querySelector("button[type=submit]");
  let busy = false;
  const again = document.createElement("button");
  again.type = "button";
  again.className = "form-again";
  again.textContent = t("home.formAgain");
  status.after(again);
  again.addEventListener("click", () => {
    form.classList.remove("is-sent");
    status.textContent = "";
    delete status.dataset.key;
    form.querySelector("input[name=name]")?.focus();
  });

  const say = (key, state) => {
    status.dataset.state = state;
    status.dataset.key = key;
    status.textContent = t(key);
  };

  window.addEventListener("languagechange", () => {
    again.textContent = t("home.formAgain");
    if (status.dataset.key) status.textContent = t(status.dataset.key);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(form);
    if (data.get("_honey")) return;
    const name = String(data.get("name") || "").trim();
    const contact = String(data.get("contact") || "").trim();
    if (!name || !contact) {
      say("home.formRequired", "error");
      return;
    }
    busy = true;
    button.disabled = true;
    say("home.formSending", "info");
    try {
      const payload = { name, contact, method: data.get("method"), interest: data.get("interest") };
      // Saved on our own server (shown in the admin page) and also emailed to the club inbox.
      // The form counts as sent if either one goes through.
      const saved = fetch(CONTACT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, lang: getLanguage() }),
      }).then((r) => { if (!r.ok) throw new Error("save failed"); });
      const emailed = fetch(`https://formsubmit.co/ajax/${siteData.contactEmail}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...payload,
          _subject: "New interest form - Christians in Seattle at UW",
          _template: "table",
          _captcha: "false",
        }),
      }).then(async (r) => {
        const result = await r.json().catch(() => ({}));
        if (!r.ok || String(result.success) === "false") throw new Error("email failed");
      });
      const results = await Promise.allSettled([saved, emailed]);
      if (results.every((r) => r.status === "rejected")) throw new Error("failed");
      form.reset();
      form.classList.add("is-sent");
      say("home.formSent", "success");
    } catch (error) {
      say("home.formFailed", "error");
    } finally {
      busy = false;
      button.disabled = false;
    }
  });
}
