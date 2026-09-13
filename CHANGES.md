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
