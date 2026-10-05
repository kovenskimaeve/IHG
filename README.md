# ISF Holy Grail

A community-run academic resource hub for ISF Academy students: a place to
find and share past papers, lesson slides, and study guides by grade and
subject, ask and answer questions in moderated discussions, request
resources that are missing, and leave private feedback to admins — all
without accounts or logins. Currently in closed testing with a small group
of students before a wider release.

---

## Project summary

ISF students had no single, student-run place to find past papers, lesson
slides, and study guides, or to ask subject questions and get answers from
people at the same grade level — material was scattered across personal
drives, class group chats, and whatever a given teacher happened to share.
This project investigates whether a lightweight, anonymous, grade-aware
sharing hub — built and moderated by students, not the school — lowers that
friction enough for students to actually use and contribute to it.

The working assumptions behind the build: no login (any account system is
friction most students won't bother with), light moderation (profanity
filtering plus a flag/report → auto-hide-at-3 → human review pipeline,
rather than requiring pre-approval of every post), and grade-level
separation in Discussions specifically (a Grade 6 question and a Grade 11
question in the same subject are rarely useful to the same reader). The site
is being tested with a small group first, behind a one-time invite-code
gate, specifically to validate these assumptions against real use before
opening it up school-wide.

## File and folder structure

```
├── api/                      Serverless functions (Vercel). Run server-side
│                              with the Supabase service-role key, which is
│                              never exposed to the browser.
│   ├── admin.js                View/delete posts, files, requests, feedback
│   └── beta-access.js          Generate/redeem/reset one-time invite codes
│
├── src/
│   ├── pages/                 One file per route (see table below)
│   │   ├── Home.jsx              Landing page: hero, search, archive cards
│   │   ├── Browse.jsx             Past papers / study guides (shared by both routes)
│   │   ├── LessonSlides.jsx       Lesson slides (folder drill-down by grade band)
│   │   ├── Discussions.jsx        Q&A / Tips & Discussion, grade-filterable
│   │   ├── Requests.jsx           Resource requests + comment threads
│   │   ├── StudyLinks.jsx         Curated + student-submitted external links
│   │   ├── Upload.jsx             File upload form
│   │   └── Admin.jsx              Password-gated moderation dashboard
│   │
│   ├── components/             Shared UI
│   │   ├── whale/                 The 3D hero scene (react-three-fiber)
│   │   ├── BetaGate.jsx           Closed-testing invite-code screen
│   │   ├── AgreementGate.jsx      Terms-of-use click-through
│   │   ├── MaintenanceScreen.jsx  Emergency "site is down" screen
│   │   ├── ErrorBoundary.jsx      Catches render errors so one broken
│   │   │                          component can't blank the whole site
│   │   ├── FeedbackButton.jsx     Floating private-feedback widget
│   │   ├── HomeSearch.jsx         Cross-category search bar on the home page
│   │   ├── OceanMotifs.jsx, OceanDecor.jsx, SpotlightGlow.jsx, SeaDrift.jsx,
│   │   │   BackgroundBlobs.jsx    Decorative ocean-theme visuals
│   │   └── IndexCard.jsx, Navbar.jsx, Tutorial.jsx
│   │
│   ├── lib/
│   │   ├── device.js              Per-browser device ID, profanity filter,
│   │   │                          agreement flag, SHA-256 file hashing
│   │   └── lessonFolders.js       Grade-band → subject lists for Lesson Slides
│   │
│   ├── supabaseClient.js       Supabase client (anon key — public, read/write
│   │                          only what Row Level Security policies allow)
│   ├── App.jsx                 Routes, gates (beta/maintenance/terms), nav
│   └── index.css               Design tokens, shared utility classes
│
├── supabase/                  Database setup, run in order in the Supabase
│   ├── schema.sql              SQL Editor. Each migration is idempotent
│   ├── migration-2.sql         (safe to run more than once). See the "Key
│   ├── migration-3.sql         to columns" section below for what each
│   ├── migration-4.sql         table actually stores.
│   ├── migration-5.sql
│   └── migration-6.sql
│
├── public/models/              Self-hosted 3D assets (whale, ocean surface)
├── CHANGES.md                  Full build log: every fix/feature, in order,
│                                with the reasoning behind each decision
├── vercel.json, vite.config.js, tailwind.config.js, postcss.config.js
└── package.json
```

## Key to file and column labels, variables, data codes, and units of measurement

All tables live in the Supabase (PostgreSQL) `public` schema. `id` columns
are `uuid`, generated server-side. All timestamps (`created_at`, `used_at`,
etc.) are `timestamptz`, stored in UTC and rendered in the visitor's local
time by the browser.

**`files`** — one row per uploaded past paper, lesson slide, or study guide
| Column | Type | Meaning / codes |
|---|---|---|
| `type` | text, enum | `past_paper` \| `lesson_slide` \| `study_guide` |
| `grade` | text | `"Grade 6"`–`"Grade 11"`, or a band like `"Grades 7-8"` for Lesson Slides |
| `subject` | text | Free text, drawn from the lists in `src/lib/device.js` / `lessonFolders.js` |
| `file_hash` | text, unique | SHA-256 hex digest of the file content — blocks duplicate uploads |
| `made_by_student` | boolean | Self-declared at upload time (vs. teacher-made material) |
| `download_count` | integer | Incremented client-side each time a file is opened |

**`discussion_posts`** — Q&A / Tips & Discussion posts and replies
| Column | Type | Meaning / codes |
|---|---|---|
| `channel` | text | `"{category}::{subject}"`, e.g. `"Q&A::Mathematics"` — this is how posts are grouped |
| `parent_id` | uuid, nullable | Null = top-level post; set = a reply to that post |
| `grade` | text, nullable | Poster's grade (added in migration-4); null on posts made before that migration |
| `upvotes` / `downvotes` | integer | One vote per device, tracked in `post_votes` |
| `flag_count` | integer | Auto-hidden (`hidden = true`) once this reaches 3 |

**`post_votes`** — one row per (post, device) vote, `vote` is `1` or `-1` (smallint)

**`resource_requests`** — requests for missing material
| Column | Type | Meaning / codes |
|---|---|---|
| `status` | text | `"open"` by default; not currently changed anywhere in the UI |
| `subject` | text | `"Feedback"` was used as a repurposed value before migration-3 split feedback into its own table — shouldn't appear in new rows |

**`request_comments`** — replies on a resource request (`request_id` → `resource_requests.id`)

**`study_links`** — student-submitted external links (`name`, `url`, `added_by`)

**`feedback`** — private messages from the floating feedback button. No public
read policy at all — only readable via the admin API with the service-role
key, by design (see `CHANGES.md`, Round 4).

**`beta_invites`** — closed-testing invite codes
| Column | Type | Meaning / codes |
|---|---|---|
| `code` | text, unique | 6 characters, charset `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `0/O/1/I/L`, to avoid misreads) |
| `used_at` | timestamptz, nullable | Null = unredeemed; set = claimed by whichever browser redeemed it first |

Also no public read/write policy at all — codes are only ever touched
server-side, through `api/beta-access.js`.

## Details of processing and analysis

**Frontend:** React 18 + Vite, React Router for routing, Tailwind CSS for
styling. `react-three-fiber` / `@react-three/drei` / `three.js` /
`postprocessing` render the 3D whale hero; `lucide-react` supplies icons.

**Backend / data:** Supabase — PostgreSQL with Row Level Security (each
table's policies decide exactly what the public anon key can read/write;
see the table above), Realtime (tables explicitly added to the
`supabase_realtime` publication push live updates to every open tab with no
refresh needed), and Storage (the `papers` bucket holds uploaded files).
Privileged operations (deleting any post, reading feedback, generating
invite codes) run through the two files in `api/`, which are deployed as
Vercel serverless functions using the Supabase **service-role** key — a
key that bypasses Row Level Security entirely and must never reach the
browser, which is why it only ever appears in `process.env` on the server
side, never in `import.meta.env` on the client.

**Hosting / deployment:** Vercel, auto-deploying from GitHub on every push.
Required environment variables (Vercel → Settings → Environment Variables):

| Variable | Used by | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | browser | Public |
| `VITE_SUPABASE_ANON_KEY` | browser | Public, but constrained by RLS |
| `SUPABASE_URL` | server (`api/`) | Same URL, no `VITE_` prefix |
| `SUPABASE_SERVICE_ROLE_KEY` | server (`api/`) | Secret — bypasses RLS |
| `ADMIN_PASSWORD` | server (`api/`) | Gates `/admin` and the privileged API actions |
| `VITE_BETA_GATE_ENABLED` | browser | Set to `false` to open the site to everyone; on by default |
| `VITE_MAINTENANCE_MODE` | browser | Set to `true` for an emergency full-site takedown |

`VITE_` vars are baked in at build time — changing one requires a new
deploy, not just a saved setting. Database setup is the six files in
`supabase/`, run in numeric order in the Supabase SQL Editor; what each one
adds and why is documented at the top of the file itself and in
`CHANGES.md`.

**Browser-side processing worth knowing about:** file uploads are hashed
client-side with `crypto.subtle.digest('SHA-256', …)` before upload, purely
to detect duplicates — nothing is encrypted. A per-browser device ID
(`crypto.randomUUID()`, stored in `localStorage`) tracks one-vote-per-device
on discussion posts without needing accounts. The beta invite token is kept
in `sessionStorage` (cleared when the tab/browser closes — see "closed
testing" above); an authenticated admin session is kept in `localStorage`
instead, since an admin shouldn't have to re-prove that on every visit.

## Links to other data sources

- **Whale 3D model** — via [Sketchfab](https://sketchfab.com), CC
  Attribution license; credited in the hero section's footer and in
  `src/components/whale/WhaleModel.jsx`.
- **Curated external study links** (shown on the Study Links page, in
  addition to student-submitted ones):
  [Khan Academy](https://www.khanacademy.org),
  [Dr Frost Maths](https://www.drfrostmaths.com),
  [Mathspace](https://mathspace.co), [Quizlet](https://quizlet.com),
  [BBC Bitesize](https://www.bbc.co.uk/bitesize).
- **Platform documentation**, for anyone maintaining this project:
  [Supabase docs](https://supabase.com/docs),
  [Vercel docs](https://vercel.com/docs),
  [Vite docs](https://vitejs.dev), [React docs](https://react.dev).
- **`CHANGES.md`** in this repo is effectively a linked data source in its
  own right — every decision summarized above (why RLS is set up this way,
  why feedback is a separate table, why the beta gate uses `sessionStorage`)
  is explained in full there, in the order it happened.
