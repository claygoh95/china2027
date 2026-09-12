# Travel 2027

A personal dashboard for Japan (tentative snowboarding, 5–14 March 2027) and Yunnan (14–23 May 2027).

## Code and saved plans

GitHub stores layout, appearance, and features. Supabase stores itinerary activities, participants, accommodations, and pre-wedding shoot plans. The first editable feature is the itinerary: add, edit, move to another trip day, and delete activities. Participants, accommodations, and PWS sections currently load from the database as read-only views; their editing forms are a future addition. Flights and snowboarding wishlists remain static placeholders.

Sign in using an approved email address. The email link returns to the same trip page; open it on the computer running your local server. The browser remembers your sign-in until you sign out. The database checks editor access for every request; signing up alone does not grant access. Saved planning sections are hidden while signed out. Trip names/dates and older committed participant details are still present in this public repository/history; this does not make previously public information private.

Saving updates the database immediately, without a Git commit or deployment. Other open tabs can use Refresh or reload their plans on focus. Unsaved drafts are protected from background refresh. Conflicting edits are rejected instead of silently overwriting another tab. If a connection fails during Save, the draft remains; check the latest saved plan before retrying. Stable activity IDs prevent duplicate inserts on retry.

## Run locally

Pull the latest `main` into your existing clone, then from the repository directory run:

```sh
git pull --ff-only
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173/yunnan.html` or `http://localhost:4173/japan.html`. Enter your approved email and choose **Email me a sign-in link**. Keep the server running and open the email link on this computer. Then select a day and choose **Add activity**.

The existing VS Code Live Server URLs are also configured:

- `http://127.0.0.1:5500/china2027/dist/yunnan.html`
- `http://127.0.0.1:5500/china2027/dist/japan.html`

For a different hostname, port, path, or hosted deployment, first add its exact trip-page URLs in Supabase → Authentication → URL Configuration. The old Sites deployment has not been updated. GitHub pushes do not automatically redeploy it.

## Files

- `dist/index.html`: all-trips overview.
- `dist/japan.html`, `dist/yunnan.html`: dashboard layout.
- `dist/app.js`: day-tab navigation.
- `dist/database.js`: sign-in, database loading, and itinerary forms.
- `dist/travel-data.mjs`: input validation and database mutations.
- `dist/database-config.js`: public project URL and publishable key; never add a secret or service-role key.
- `dist/style.css`: shared dark theme and responsive controls.
- `database/schema.sql`: one-time setup for a new project. Already applied to the current project; do not run it again there.

There is no build step. The browser loads Supabase JS 2.116.0 from a pinned CDN URL with a SHA-384 integrity check. Internet access is required for sign-in and database operations.

## Database administration

Tables use row-level security. Only an approved, non-anonymous authenticated email can read saved plans or modify itinerary activities. The editor allowlist cannot be modified from the browser. To add an editor, the project administrator inserts their lower-case email into `public.travel_editors` using Supabase's SQL editor. Keep real editor emails out of this public repository. Removing an email from that table removes database access on subsequent requests.

`travel_sections` contains JSON data for participants, accommodations, and PWS, seeded from the original dashboard. Accommodations use an array of objects with `name`, `location`, `check_in`, `check_out`, and `notes`. PWS uses `arrangements`, `tasks`, and `notes`. These can currently be maintained by the administrator in the Supabase table editor.

The free built-in email sender is being used with its default sign-in-link templates. It is limited to project organization members and has restrictive email rate limits. Adding other editors such as Wendy may require custom SMTP. No paid service was enabled. See [Supabase email delivery documentation](https://supabase.com/docs/guides/auth/auth-smtp).

## Verification

```sh
node --test tests/travel-data.test.mjs
```

Validation, optimistic concurrency, stable insert IDs, and error handling are covered by five tests. Live SQL verification confirmed authorized CRUD, date validation, stale-update rejection, and blocked public/unauthorized access, with all temporary rows rolled back. Browser UI flows were checked using isolated sample data. The first real email sign-in and browser-to-database save still need to be exercised by the account owner.

## Images

Yunnan: Lugu Lake photograph by Aqu1248050, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), cropped for the banner. [Source](https://commons.wikimedia.org/wiki/File:Lugu_lake_China_Yunnan.jpg).

Japan: AI-generated winter landscape.
