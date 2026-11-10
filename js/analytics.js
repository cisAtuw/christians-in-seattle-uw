// Privacy-friendly visit statistics (Cloudflare Web Analytics: no cookies, no personal data).
// Paste the site token from Cloudflare dashboard → Web Analytics below. Empty = disabled.
const CF_BEACON_TOKEN = "d3c56e91fee547aebdb2e46bda6949cb";

if (CF_BEACON_TOKEN && !location.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.dataset.cfBeacon = JSON.stringify({ token: CF_BEACON_TOKEN });
  document.head.appendChild(s);
}
