# ISF Holy Grail — deployment guide (no coding required)

Everything is already written. You're just connecting three free
accounts together. Takes about 20–30 minutes the first time.

## 1. Set up the database (Supabase)

1. Go to supabase.com → sign up free → "New project".
2. Once it's created, open the **SQL Editor** (left sidebar) → New query.
3. Open `supabase/schema.sql` from this project, copy everything, paste
   it in, click **Run**. This creates all your tables.
4. Go to **Storage** (left sidebar) → **New bucket** → name it exactly
   `papers` → toggle it **Public** → Create.
5. Go to **Project Settings → API**. You'll need three values later:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this one secret — never put it in the
     frontend code, only in Vercel's environment variables in step 3)

## 2. Put the code on GitHub

1. Go to github.com → sign up free → **New repository** → name it
   `isf-holy-grail` → Create.
2. On the new repo page, click **uploading an existing file** → drag
   in every file and folder from this project → Commit changes.
   (No command line needed — this is just a file upload.)

## 3. Deploy it (Vercel)

1. Go to vercel.com → sign up free with your GitHub account.
2. **Add New → Project** → import your `isf-holy-grail` repo.
3. Before deploying, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon public key
   - `SUPABASE_URL` → same Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` → your Supabase service_role key
   - `ADMIN_PASSWORD` → a password you make up, for the /admin page
4. Click **Deploy**. In about a minute you'll get a live link like
   `isf-holy-grail.vercel.app` — that already works, fully.

## 4. Add your real domain

1. Buy a domain (Cloudflare Registrar or Namecheap, ~US$10–15/year —
   this is the only actual cost in this whole setup).
2. In Vercel: your project → **Settings → Domains** → add your domain.
3. Vercel shows you 1–2 DNS records to add at your domain registrar.
   Add them there, wait a few minutes — done.

## What's here vs. what to add next

Included and fully working: grade/subject browsing, PDF preview,
duplicate-file detection, multi-file upload, live discussions with
voting and one level of replies, report → auto-hide at 3 flags, study
links, resource requests with upvotes, a draggable feedback button, and
a real password-gated admin page (the password check happens on the
server, not in the browser, so it can't be bypassed by viewing source).

Worth layering in next, once this is live and you've seen how it's
actually used:
- A visible strikes/ban list in the admin page (the `strikes` table
  pattern from our schema discussion — happy to add this next)
- A stronger moderation filter than the starter wordlist in
  `src/lib/device.js`
- Turning the "three strikes" ban into something enforced (right now
  reports feed the admin queue for a human decision, which is the
  more realistic version of this given there's no login)
