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
