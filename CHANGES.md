# What changed, and what you need to do

## Do these two things first — they fix most of it

### 1. Run the SQL migration
Open your **Supabase project → SQL Editor → New query**, paste in the contents of
`supabase/migration-3.sql`, and hit Run. This resets the sharing permissions
(RLS policies) that control who can read/write what, and creates two new tables:
`request_comments` (so Requests can be replied to) and `feedback` (a genuinely
private table admins can read but nobody else can).

Why this matters: the old `supabase/schema.sql` used
`create policy if not exists ...`, which is **not valid PostgreSQL syntax**.
That line almost certainly failed silently when you first ran it, which is the
most likely reason posts/requests weren't behaving as fully public as the code
intended.

### 2. Check your Vercel environment variables
Go to your Vercel project → **Settings → Environment Variables** and confirm
all five of these are set (for Production *and* Preview):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (same value as above, no `VITE_` prefix — used by the admin API)
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → service_role key. Keep this secret!)
- `ADMIN_PASSWORD` (whatever password you want for `/admin`)

**If you add or change any of these, you must trigger a new deploy** — Vite
bakes `VITE_...` vars in at build time, so just saving them in Vercel isn't
enough. A missing/wrong `VITE_SUPABASE_URL` is the classic cause of a
`TypeError: Failed to fetch` showing up anywhere data is submitted.

## Code fixes in this drop

1. **Discussions/Requests visibility** — `supabase/migration-3.sql` re-asserts
   public read+write policies on `discussion_posts` and `resource_requests`.
   The front-end code was already written to show everyone's posts; the gap
   was almost certainly the broken migration syntax above.
2. **Requests had no commenting at all** — added a full reply/comment thread
   under each request (`src/pages/Requests.jsx` + new `request_comments` table).
3. **"TypeError" in green on Feedback** — two separate bugs, both fixed:
   - `tailwind.config.js`: the `oxblood` color (used everywhere for errors/delete
     buttons) was defined as a muted **green** (`#5C8A7A`) instead of red. Now
     it's an actual dark red (`#8C3A3A`), so errors read as errors.
   - `src/components/FeedbackButton.jsx` now wraps its Supabase call in
     try/catch and shows a clear message instead of a raw error string.
   - `src/supabaseClient.js` now logs a loud, specific console error if the
     Supabase env vars are missing, instead of letting every request fail
     with a cryptic fetch error.
4. **Admin couldn't view/delete anything** — `src/pages/Admin.jsx` and
   `api/admin.js` were rewritten so the admin panel *only* talks to the
   privileged `/api/admin` serverless function (which uses your Supabase
   **service role key** and completely bypasses RLS), for both reads and
   writes. Previously it read data with the public anon key, so it was at the
   mercy of the same broken RLS policies as everything else. Added a
   **Requests** tab (was missing) and a delete button on **Feedback** (was
   missing). Every tab now shows a clear error message inline if something
   fails, instead of just looking empty.
5. **Feedback privacy** — feedback now lives in its own `feedback` table with
   no public SELECT policy at all, so it's enforced at the database level, not
   just hidden in the UI. Previously it lived in `resource_requests` (subject
   = `'Feedback'`), which had a public read policy — meaning anyone with
   browser dev tools could query it directly, regardless of what the UI
   showed. The feedback widget no longer shows a "everyone's feedback" feed
   to visitors, since that contradicted it being private. The migration also
   moves any existing feedback rows into the new table and removes them from
   the public one.
6. Removed a stray duplicate copy of the whole app that had ended up nested
   inside `supabase/src/`, `supabase/api/`, etc. — it wasn't part of the
   actual build (Vercel builds from the repo root), just dead weight that
   made the repo confusing to navigate. Also removed a stray
   `isf-holy-grail (1).zip` that was sitting in the repo root.

## How to apply this

Easiest path: copy these changed/added files over their counterparts in your
GitHub repo, commit, and push (Vercel will redeploy automatically):

- `tailwind.config.js`
- `src/supabaseClient.js`
- `src/pages/Discussions.jsx`
- `src/pages/Requests.jsx`
- `src/pages/Admin.jsx`
- `src/components/FeedbackButton.jsx`
- `api/admin.js`
- `supabase/migration-3.sql` (new — run in Supabase SQL Editor, see above)

Then run the SQL migration and double check the env vars as described above.
I verified the whole project installs and builds cleanly (`npm install && npm run build`).

---

## Round 2: Home page aesthetics + usability

New dependency: **`lucide-react`** (icons) — already added to `package.json`, just
run `npm install` after pulling these files.

1. **Cleared up the "mystery" hero labels.**
   - "WHALE COLOR" → relabeled "Tint the whale" in normal sentence case, right
     above the color swatches it controls.
   - "SCROLL // EXPLORE" (a dead-end floating button that didn't actually do
     anything) → replaced with a real **"Explore the archive ↓"** button
     placed directly under the hero tagline, which smooth-scrolls down to the
     archive section. Removed the now-unused `ScrollHint.jsx`.
2. **Redesigned the four home cards** (`src/pages/Home.jsx`) as an asymmetric,
   ocean-toned bento layout instead of identical white boxes: circular
   "porthole" icon badges (`lucide-react`), a large Past Papers tile, live
   counts pulled from your real data ("N papers shared", "N posts this week"
   — genuine counts, not placeholder numbers), and a "+ Request a missing
   file" link on the Past Papers card that jumps to `/requests`.
3. **Added a real global search** (`src/components/HomeSearch.jsx`): a search
   bar plus grade filter chips and a subject dropdown, sitting right above
   the archive cards. It searches past papers, lesson slides, and study
   guides together and lets you preview or download straight from the
   results — no more digging through separate category pages first.
4. **Spotlight cursor effect** (`src/components/SpotlightGlow.jsx`): a soft
   glow that follows the pointer across the dark ocean band. Respects
   `prefers-reduced-motion` (skips itself if the visitor has that set).
5. The whole ocean gradient now runs continuously from the whale hero into
   the archive section, rather than cutting abruptly to the flat parchment
   background — ties the "ocean theme" through the whole landing page.

Files touched/added this round: `src/pages/Home.jsx`,
`src/components/whale/WhaleHero.jsx`, `src/components/HomeSearch.jsx` (new),
`src/components/SpotlightGlow.jsx` (new), `package.json`. Removed
`src/components/whale/ScrollHint.jsx` (dead code after the CTA rework).
Verified with a clean `npm install && npm run build`.

---

## Round 3: Discussion grade filtering, glow tuning, ocean decor

1. **`supabase/migration-4.sql`** — Discussions already tags each post with a
   `grade` and has an "All grades" filter dropdown in the UI, but the
   database itself had no `grade` column, so every post submission would
   have failed with a Postgres error. Run this migration (after
   migration-3.sql) to add the column — nullable, so nothing existing breaks.
2. **Glow retuned** (`src/components/SpotlightGlow.jsx`): smaller and more
   defined — a bright core fading to the ocean tint then to nothing by
   ~70% — so it reads as a flashlight beam rather than a soft wash.
3. **Ocean decor** (`src/components/OceanDecor.jsx`, new): a few low-opacity
   line-art coral, kelp, and shell silhouettes scattered around the edges of
   the archive section, swaying very slowly. They sit *behind* the spotlight
   glow, so as the glow passes over them they light up a little — the
   flashlight-discovering-things-in-the-dark effect. Kept subtle and off to
   the sides so they don't compete with the cards or search bar. Respects
   `prefers-reduced-motion` (sway turns off).

---

## Round 3: grade filter, ocean motifs, glow tuning

1. **Discussions grade filter** — wired up end to end: posting requires
   picking a grade, and there's an "All grades" / Grade 6–11 filter above the
   thread. Added `supabase/migration-4.sql` (adds the `grade` column —
   without it every post would fail). **Run this migration too.** Posts are
   tagged with a grade rather than split into fully separate grade-only
   rooms, so a Grade 11 Econ question and a Grade 9 one can still share a
   subject thread by default, but you can narrow to just your grade when you
   want to.
2. **Ocean motifs** — added `src/components/OceanMotifs.jsx`: simple
   line-art coral, shell, seaweed, and bubble motifs in the same thin-stroke
   style as the existing icons. Each home card now has one tucked into its
   corner (coral for Past Papers, bubbles for Lesson Slides, a shell for
   Study Guides, seaweed for Discussions), and a quiet reef silhouette now
   sits along the bottom edge of the ocean band.
3. **Spotlight size** — already tuned to a ~320px beam with a bright core
   that falls off quickly (a flashlight, not a floodlight) — left as is.

---

## Round 3: Grade-level differentiation in Discussions

Run **`supabase/migration-4.sql`** in the Supabase SQL editor first — it adds
a nullable `grade` column to `discussion_posts`. Nullable on purpose: it
doesn't touch or hide any post that already exists, they just won't have a
grade tag until someone replies/re-posts.

- Posting now requires picking "Your grade" alongside your display name.
- Browsing has an optional "All grades" / specific-grade filter next to the
  subject picker — leave it on "All grades" to see everything like before, or
  narrow to just your own grade.
- Each post/reply's byline now shows the poster's grade when it has one
  (older posts made before this migration just won't show a grade — that's
  expected, not a bug).

I didn't split channels per-grade at the database level (e.g. a separate
"Mathematics · Grade 9" channel) because with a school-sized user base, that
risks fragmenting into a lot of near-empty channels. A filter on top of one
shared channel gets you the "see only my grade" benefit without that
downside, and it's easy to change later if activity grows and you want
harder separation.

---

## Round 4: fixed the broken archive section + a real crash bug

You sent screenshots of the archive cards looking broken — jagged dark shape
cutting through the text, card content overflowing its box. Found it:

**The bug:** `ReefSilhouette` (a decorative thin reef strip meant to sit
along the bottom of the dark archive section, ~80px tall) had its own
hardcoded `style={{ width: '100%', height: '100%' }}` baked into the
component. Inline styles always beat the CSS classes I was passing in
(`h-14 md:h-20`), and since its container's height isn't fixed (it's sized by
its content), that `height: 100%` didn't resolve to a sane number — the reef
strip ballooned to hundreds of pixels tall and rendered on top of the cards
instead of staying a thin strip underneath them. Fixed in
`src/components/OceanMotifs.jsx` (removed the hardcoded inline size) and
`src/pages/Home.jsx` (now explicitly passes `w-full` alongside the height
classes, since the component no longer supplies its own).

**A separate, more serious bug I found while testing the fix:** the whale
hero loads its lighting/reflections from an external file
(`raw.githack.com`, via drei's `Environment preset="sunset"`). If that
request ever fails — a network hiccup, or (realistically, given this is a
school site) a content filter blocking an unfamiliar CDN — the 3D scene threw
an uncaught error, and because nothing in the app catches errors, **the
entire site unmounted to a blank white page**. I removed that external
dependency (the hero now uses only its own local lights — a small visual
trade, but the models it actually needs are already self-hosted under
`/models/`, so the hero has no third-party dependency left at all) and added
`src/components/ErrorBoundary.jsx`, wrapped around the whale hero specifically
and around the whole app in `src/App.jsx` as a last line of defense — so if
anything, anywhere, throws an unexpected error in the future, that one
section fails gracefully (a plain gradient, or a "Something broke — Reload"
message) instead of taking down the whole page.

**Also, while I had things open:** gave the four archive cards distinct
accent colors pulled from the whale's own tint palette (blue / amber / teal /
rose) instead of one flat cyan treatment on all four, and turned the
"+ Request a missing file" link into a filled pill button — closer to the
richer, more colorful feel of your inspo screenshot, without introducing
external photography (would've meant either hotlinking someone else's images
or a licensing question I'd rather you make deliberately, not by default).

I rebuilt this one and actually loaded it in a headless browser to check the
render, not just the build — screenshotted it before and after to confirm
the fix, since the last two rounds I could only verify with `npm run build`
succeeding, which doesn't catch layout bugs like this one.

---

## Round 5: redesigned the ocean floor strip

You were right that the reef strip looked bad even after the width fix —
jagged "shark tooth" zigzags with sparse, barely-visible thin twig shapes
don't read as a reef at a glance. Rewrote `ReefSilhouette` in
`src/components/OceanMotifs.jsx` from scratch:

- The floor itself is now a smooth, gently rolling sandy seabed (bezier
  curves) instead of a jagged rock zigzag.
- Coral is now solid, layered, overlapping blob clusters (with a subtle
  highlight) rather than thin 2px stroke lines — visible at a glance instead
  of disappearing into the dark background.
- Kelp is now a filled tapered blade shape instead of a bare stroked line, so
  it actually reads as a plant.
- Gave it a bit more vertical room (`h-32 md:h-48`, up from `h-24 md:h-36`)
  so the coral and kelp aren't squashed.

I also confirmed with a fresh headless-browser screenshot that the earlier
width fix held — the strip does run edge-to-edge in the current code. If
what you saw was still cut off, that screenshot was very likely from before
you redeployed the Round 4 zip rather than a new bug; worth double-checking
you're on the latest deploy after this one goes live too.

---

## Round 6: maintenance mode + how to shut things down in an emergency

Two different tools for two different situations — read both before you need
either one.

### 1. Planned maintenance / "I need to edit something live" (a few minutes, not urgent)

New env var: **`VITE_MAINTENANCE_MODE`**. Set it to `true` in Vercel
(Settings → Environment Variables, Production), then redeploy (Vite env vars
are baked in at build time, so this needs a rebuild — click the "..." on the
latest deployment → Redeploy, doesn't need a new git push, takes about a
minute). Every route except `/admin` will show a clean "Diving for a bit —
back soon" screen instead of the real site. `/admin` still works normally so
you can log in and check things while it's up. No data is touched — it's
purely a front-end gate. Set it back to `false` and redeploy to bring the
site back. I tested both states in a headless browser before shipping this
(screenshots of the maintenance screen, and confirmed `/admin` stays
reachable while everything else is blocked).

### 2. Something is actively wrong right now (spam flood, abuse, possible compromise)

Don't wait for a Vercel redeploy — the fastest kill switch doesn't involve
Vercel at all:

- **Fastest (seconds, no redeploy): rotate your Supabase anon key.**
  Supabase dashboard → Settings → API → regenerate the `anon` `public` key.
  Every student's browser is using that key for every read/write, so this
  instantly breaks the entire public-facing site (pages will show load
  errors) without touching any data. Your `service_role` key is separate and
  unaffected, so `/api/admin` — and therefore `/admin` — keeps working, so
  you can still see what happened and clean it up. When you're ready to
  bring it back: update `VITE_SUPABASE_ANON_KEY` in Vercel to the new key
  and redeploy.
- **If it's specifically spam/abuse rather than a security issue:** you can
  be more surgical — in the Supabase SQL Editor, run
  `drop policy "public insert posts" on discussion_posts;` (swap the table/
  policy name for whichever is being abused) to stop new writes while
  reads still work. Re-add it later by re-running the relevant section of
  `migration-3.sql`.
- **If you suspect the GitHub repo or Vercel account itself was
  compromised:** Vercel → Deployments → "..." on your last known-good
  deployment → **Promote to Production** (this is Vercel's instant
  rollback — takes effect in seconds, no rebuild). Then rotate your GitHub
  and Vercel account passwords/tokens.

For a real incident I'd reach for the anon key rotation first — it's the
single fastest way to take the whole public site offline, it's reversible in
one click, and it doesn't lock you out of `/admin` while you sort things
out.

---

## Round 7: restrict the site to your 10 testers, with one-time codes

Checked first: Vercel's built-in password protection isn't available on the
Hobby (free) plan for your actual production URL — it's a $150/mo add-on on
Pro, or included on Enterprise. Their free "Vercel Authentication" option
only protects preview/auto-generated URLs, not the plain
`isfholygrail.vercel.app` you're sharing. So I built this in the app itself.

You specifically wanted codes that can't just be reused by whoever they get
forwarded to, so this isn't one shared password — it's individual one-time
codes, generated and tracked from the admin panel:

- Run **`supabase/migration-5.sql`** in the Supabase SQL editor first. It
  adds a `beta_invites` table that has **no public policies at all** — not
  even insert — so codes can never be listed or guessed through the public
  API. Only the server-side service-role key can touch it.
- In `/admin`, a new **Beta codes** tab generates however many codes you
  need (optionally labeled with tester names), each 6 characters using a
  charset with no `0/O` or `1/I/L` so they're easy to read back over text or
  email.
- The whole site now sits behind a "Private testing — enter your invite
  code" screen until a visitor enters a valid code. On success, that code is
  marked used server-side and that browser remembers it (so they're not
  asked again). If someone else then tries the same code, it's rejected —
  the code only ever works for the first device that redeems it.
- If a tester needs to switch devices, hit **Reset** next to their code in
  the admin panel — that clears its "used" status so it'll work again once.
- `/admin` always bypasses the gate, same as before, so you can never lock
  yourself out.
- New env var, off by default when unset: **`VITE_BETA_GATE_ENABLED`**. When
  you're done with closed testing, set it to `false` in Vercel and redeploy
  to open the site to everyone — no code changes needed, and the codes/table
  just sit there unused afterward.

I tested this in a headless browser before shipping it: the gate renders and
blocks the home page by default, `/admin` bypasses it, and a rejected code
shows the inline error correctly.

**Worth knowing:** the redemption check and the codes themselves live
server-side (unlike a simple shared password baked into the front-end), so
this is meaningfully harder to bypass than the shared-code approach I
considered first — but it's still built for keeping a casual link-share from
spreading during a small test, not for withstanding a determined attacker
targeting the database directly. Your Supabase URL and anon key are still
visible in the public JS bundle, as with any Vite app.

I also removed the earlier `AccessGate` component and `VITE_ACCESS_CODE` env
var from an earlier pass at this same problem — this one-time-code system
replaces it entirely rather than running alongside it.

---

## Round 8: made the invite gate actually behave as "one time"

Three fixes, all from testing the gate for real:

1. **Codes were effectively permanent, not one-time.** The redeemed token
   was stored in `localStorage`, which survives closing the tab or even the
   whole browser — so a tester never got asked again after their first visit.
   Switched to `sessionStorage` in `src/components/BetaGate.jsx`: access now
   lasts for that one browser session and clears when the tab/browser
   closes. Since the code was already marked used on first redemption
   (that part was always working), closing the tab and coming back now
   correctly asks for a code again — and the old one won't work, matching
   what you asked for.
2. **Admin now never needs an invite code, anywhere on the site** — not just
   on `/admin`. Logging into `/admin` with the real admin password now sets
   a separate `localStorage` flag that `BetaGate` also checks, so once
   you've logged in as admin on a browser, you can browse the whole public
   site from that browser without hitting the gate. This one deliberately
   uses `localStorage` (persists across sessions), unlike tester access —
   you shouldn't have to re-prove you're the admin every time, the way
   testers have to re-enter a code.
3. **Live updates everywhere, not just Discussions/Requests.** Past papers,
   lesson slides, study guides (`Browse.jsx`, `LessonSlides.jsx`), study
   links (`StudyLinks.jsx`), and the live counts on the home page now all
   subscribe to realtime changes the same way Discussions already did — a
   new upload or post appears for everyone looking at that page without
   them refreshing. This needed a database change too: **run
   `supabase/migration-6.sql`** — Realtime only streams changes for tables
   explicitly registered for it, and `files`/`study_links` were never
   registered, so without this migration the new subscriptions would
   silently do nothing.

I tested the sessionStorage/admin-bypass behavior directly (set the gate's
default-blocked state, then the admin flag, confirmed each) before shipping
this round.
