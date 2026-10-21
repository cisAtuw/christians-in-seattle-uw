import { siteData } from "../data/site.js";
import { t } from "./i18n.js";

export function bindInterestForm(form) {
  if (!form) return;
  const status = form.querySelector("[data-form-status]");
  const button = form.querySelector("button[type=submit]");
  let busy = false;

  const say = (key, state) => {
    status.dataset.state = state;
    status.dataset.key = key;
    status.textContent = t(key);
  };

  window.addEventListener("languagechange", () => {
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
      const response = await fetch(`https://formsubmit.co/ajax/${siteData.contactEmail}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name,
          contact,
          method: data.get("method"),
          interest: data.get("interest"),
          _subject: "New interest form - Christians in Seattle at UW",
          _template: "table",
          _captcha: "false",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || String(result.success) === "false") throw new Error("failed");
      form.reset();
      say("home.formSent", "success");
    } catch (error) {
      say("home.formFailed", "error");
    } finally {
      busy = false;
      button.disabled = false;
    }
  });
}
