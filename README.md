# Marketing Command Center — Setup Guide

One login. Three companies (Alliance Permitting Service, Alliance Data Solutions, TigerLeads AI).
Two areas (SEO + Paid/Social). Tasks, multi-assignee, deadlines, notes, file attachments, and a calendar.

You'll do five things, in order. Total time: ~30–40 minutes. No coding required —
just copy/paste and click. Steps 1–2 set up the database; 3–4 deploy the app; 5 loads the content.

---

## What you need before starting
- The project folder (this zip, unzipped).
- Your Supabase project (already created): `https://ttebeawoxnruxlgbruza.supabase.co`
- A GitHub account and a Vercel account (free tiers are fine). Marshall has used both before.
- Node.js installed on your computer (only needed for Step 5 — the one-time seed).

---

## STEP 1 — Create the database tables (5 min)

1. Go to **supabase.com**, open your project.
2. Left sidebar → **SQL Editor** → **New query**.
3. Open `supabase/01_schema.sql` from this folder, copy ALL of it, paste into the editor.
4. Click **Run** (bottom right).
5. You should see "Success. No rows returned." That's correct — it created the tables,
   security rules, the 4-person allow-list, and the file-storage bucket.

✔ Done when: under **Table Editor** you can see tables `companies`, `tasks`,
`task_assignees`, `notes`, `attachments`, `allowed_users`.

---

## STEP 2 — Turn on email login (3 min)

1. Supabase → left sidebar → **Authentication** → **Providers**.
2. Make sure **Email** is enabled. Under it, turn ON **"Confirm email"** is optional;
   what matters is that email sign-in is allowed. (Magic-link uses the Email provider.)
3. Left sidebar → **Authentication** → **URL Configuration**.
   - Set **Site URL** to your app's address. For now you can use
     `http://localhost:3000`; after Step 4 you'll change it to your real Vercel URL.
   - Under **Redirect URLs**, add: `http://localhost:3000/auth/callback`
     (and later your Vercel URL + `/auth/callback`).

Note: only the 4 allow-listed emails can actually use the app, even if someone else
tries to sign in — the database security rules block everyone else.

---

## STEP 3 — Put the code on GitHub (5 min)

1. Create a new **private** repository on GitHub (e.g. `marketing-command-center`).
2. Upload this whole folder to it. Easiest way without commands:
   GitHub → your new repo → **"uploading an existing file"** → drag in all the files/folders.
   (Or, if you use git: `git init && git add . && git commit -m "init" && git push`.)

Do NOT upload a `.env.local` file if you made one — secrets go in Vercel (Step 4), not the repo.

---

## STEP 4 — Deploy on Vercel (8 min)

1. Go to **vercel.com** → **Add New… → Project** → import your GitHub repo.
2. Vercel auto-detects Next.js. Before clicking Deploy, open **Environment Variables**
   and add these two (copy from `.env.example` in this folder):

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://ttebeawoxnruxlgbruza.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (the long `eyJ…` key in `.env.example`) |

3. Click **Deploy**. Wait for the green "Ready".
4. Copy your live URL (e.g. `https://marketing-command-center.vercel.app`).
5. Go BACK to Supabase → Authentication → URL Configuration and:
   - Set **Site URL** to your Vercel URL.
   - Add **Redirect URL**: `<your-vercel-url>/auth/callback`

✔ Done when: visiting your Vercel URL shows the sign-in screen.

---

## STEP 5 — Load the content (one click, no terminal) (2 min)

The first time anyone signs in to the live app, it shows a **"One-time setup"** screen
because the database is empty. Just click **"Load master tasks."** That loads all 327
master tasks (SEO + Paid/Social for all 3 companies) plus the first 8 weeks of Mon/Wed/Fri
posts. Done — the app appears.

For the one-click seed to work, add one more environment variable in Vercel
(Settings → Environment Variables), then redeploy:

| Name | Value | Notes |
|------|-------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API → service_role | **Secret.** Server-only; never goes in the browser or GitHub. |

(If you'd rather not use the service-role key at all, you can instead seed from a computer
with `npm install` then `npm run seed` — but the one-click button is easier.)


---

## You're live
- Go to your Vercel URL, enter your work email, click the link that arrives, and you're in.
- Share the URL with Marshall, Weston, and Dena — they sign in the same way.

### Recurring posts refresh themselves (automatic)
The Mon/Wed/Fri posting tasks are generated 8 weeks ahead and **top themselves up
automatically** every Monday at 6 AM via a built-in Vercel Cron job (`vercel.json`).
For this to run, add one more environment variable in Vercel:

| Name | Value | Notes |
|------|-------|-------|
| `CRON_SECRET` | any long random string you make up | Protects the cron URL. Vercel sends it automatically. |

You also need `SUPABASE_SERVICE_ROLE_KEY` (from Step 5) set, since the cron runs without
a logged-in user. If you ever want to top up manually, a signed-in user can also visit
`/api/generate-posts` in the browser anytime.

### Changing who can log in
Supabase → Table Editor → `allowed_users` → add or remove a row (email + name + role).
No redeploy needed.

### Trouble?
- "Can't sign in / no email": check the Redirect URL in Supabase matches your Vercel URL exactly.
- "Loading… forever": the env vars in Vercel are missing or misspelled — re-check Step 4.
- Build failed on Vercel: open the build log; it almost always names the missing variable.
