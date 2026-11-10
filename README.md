# Christians in Seattle at UW

Static bilingual website for **Christians in Seattle at UW**, a student-led Registered Student Organization at the University of Washington.

- Planned primary production domain: `https://christiansinseattle.org`
- Protected secondary domain: `https://christiansinseattle.com`
- Source code: GitHub under the `mileszhanghao` account
- Hosting: Netlify
- Domain registration and DNS: Squarespace Domains

Squarespace manages the domains and DNS. Netlify hosts the static website. GitHub is the source of truth.

## Fall 2026 Sources

The September-October schedule in this revision was audited against:

1. `Christians in Seattle RSO Transition Guide.docx`
2. `UW Church Plan List.pdf`

The plan PDF is the source for event dates, with the later planning discussion overriding earlier draft details. The current public schedule is:

- September 25, 5:30-7:30 p.m.: New Students Welcome; room to be confirmed; capacity of 70+ requested.
- September 27, tentatively 10 a.m.-2 p.m.: Sunday Worship on Campus; academic room to be confirmed.
- September 30, 5:30-7:30 p.m.: Fall Quarter Kickoff in HUB 337; capacity 70.
- October 2, 5:30-7:30 p.m.: Topic-Based Discussion in HUB 340; capacity 70.
- October 4, tentatively 10 a.m.-2 p.m.: Sunday Worship on Campus; academic room to be confirmed.

The October 2 event is active. Do not mark it cancelled.

Do not publish a person's name, phone number, private email address, roster, signature, or internal planning material from either source document.

## Local Preview

From this directory:

```powershell
python -m http.server 4174
```

Open `http://127.0.0.1:4174/`. Do not open the HTML files directly because JavaScript modules require a local server.

## Shared Configuration

Edit `data/site.js` for organization-wide information:

```js
organizationName
organizationNameZh
instagramUsername
instagramUrl
instagramQrImage
discordInviteUrl
discordChannelUrl
campusGroupsUrl
churchWebsiteUrl
contactEmail
primaryDomain
secondaryDomain
lastUpdated
```

Leave an unconfirmed public link as an empty string. The site hides the corresponding button automatically. Never use a Discord channel URL as a public invite URL.

## Updating September-October Events

Edit `data/events.js`. Each event records its public description, date, time, building, room, audience, source, publication status, cancellation status, and confirmation flags.

Use confirmation flags literally:

```js
confirmed: {
  date: true,
  time: false,
  building: false,
  room: false,
  location: false,
}
```

Do not fill a missing time, room, contact, or registration link by guessing. If an event is cancelled, set `cancelled: true`; cancelled events remain visible for clarity but do not receive calendar links.

After editing event data:

1. Update `lastUpdated` in `data/site.js`.
2. Regenerate all calendar files:

   ```powershell
   node scripts/generate-calendar.mjs
   ```

3. Check English and Chinese.
4. Check the homepage and full schedule on desktop and mobile.
5. Test the individual and combined Google Calendar links.

## Calendar Rules

`scripts/generate-calendar.mjs` creates:

- one file per published event in `calendar/events/`
- `calendar/fall-2026-orientation.ics` with all published, non-cancelled events

Timed events use `America/Los_Angeles`. A tentative time is still represented as a timed event and is clearly labeled "to be confirmed" on the website and in the calendar description.

Every event contains:

- stable `UID`
- `DTSTAMP`
- `DTSTART`
- `DTEND`
- bilingual `SUMMARY` and `DESCRIPTION`
- `LOCATION`
- `URL`

The generator escapes commas, semicolons, backslashes, and line breaks and folds long calendar lines.

## Instagram

Instagram is configured in `data/site.js`. The current public profile is:

`https://www.instagram.com/christiansinseattleatuw`

The QR image is `images/qr/instagram-uw.png`. Replace that file with the new official QR image when the account changes, keep the same square aspect ratio, and test it with a phone before publishing.

The official logo is `images/branding/logo-cis-uw.jpg`, confirmed against the public Instagram profile.

## Discord

- `discordInviteUrl` is for prospective members and every **Join Discord** button.
- `discordChannelUrl` is only for people who already joined the server and have channel permission.

The current permanent invite is `https://discord.gg/KaU6RJ3ZWE`. Keep `discordInviteUrl` set to this invite and reserve `discordChannelUrl` for the existing-member `#general` channel.

## Images

Use:

```text
images/
  branding/
  qr/
  hero/
  events/
  gallery/
  announcements/
  social/
```

Use original, approved organization assets. Add useful alt text and optimize large files. Public Instagram posts can be content candidates, but photos with identifiable people still require publication approval. Do not use screenshots when an original file is available.

## Quality Checks (CI)

Every pull request and every push to `main` or `staging` runs `.github/workflows/quality.yml`. A change can't go live unless both gates pass:

1. **Accessibility (axe-core):** 0 violations on the 10 public pages, in English and Chinese, at phone (390px) and desktop (1280px) widths: 40 checks (`tests/accessibility.test.mjs`).
2. **Lighthouse CI:** Accessibility and SEO must score 100 on every public page (mobile profile). `offline.html` is deliberately `noindex`, so only its accessibility is checked. Performance and Best Practices are reported as warnings because they depend on the CI machine. Reports are kept as a build artifact.

Run them locally:

```bash
npm install
npx playwright install chromium
npm run serve &          # http://127.0.0.1:4174
npm run test:a11y
npx lhci autorun
```

## GitHub and Netlify Workflow

1. Create a branch from `main`.
2. Make and test the content change.
3. Open a Pull Request.
4. Review the Netlify Deploy Preview.
5. Verify all links, both languages, mobile layout, and calendar data.
6. Merge to `main` only after approval.

Do not change Squarespace DNS until the Netlify preview has been approved. Preserve all existing MX, TXT, verification, and email records during any future domain migration.

## Security and Privacy

Never commit:

- student rosters
- private phone numbers or email addresses
- private Discord messages or prayer requests
- login credentials, passwords, or API tokens
- domain transfer codes
- old officer signatures or private constitution pages
