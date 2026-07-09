# What's new

This build adds task editing, team/completion tracking, phase selection, and a
new **Import** feature. One database change is required (see the bottom).

---

## Importing a task list or calendar

On the **Board**, use the new **Import** button (top right, next to "Add task").

You can upload either a **CSV** or a **JSON** file. Everything in it is added to the
board, grouped by phase — and any task that has a deadline shows up on the **Calendar**
automatically.

### The fastest way: let Claude build the list

1. Click **Import → Copy prompt**.
2. Paste that prompt into Claude, and at the end describe what you want — e.g.
   "a July social calendar for TigerLeads, 3 posts a week" or "the setup tasks for
   Alliance Data's paid search launch."
3. Claude replies with CSV text. Paste it into a plain text file and save it as
   `something.csv` (or ask Claude to give you a downloadable file).
4. Back in the dashboard, **Import → drop the file in → Review → Import**.

The copied prompt already tells Claude the exact columns, the valid phases for each
track, and the company codes, so the output lands in the right shape.

### Prefer to make the file yourself?

Click **Download CSV template** in the Import window for a starter file. The columns are:

| Column | Required? | Accepts |
|--------|-----------|---------|
| `company` | no* | `aps`, `ads`, `tgr` (or the full company name) |
| `track` | no* | `seo` or `paid_social` (also accepts "paid", "social", "organic") |
| `phase` | no* | Any phase name; close matches snap to the real phase |
| `title` | **yes** | The task description |
| `priority` | no | `high`, `medium`, `low` |
| `status` | no | `not_started`, `in_progress`, `blocked`, `done` |
| `cadence` | no | `one-time`, `weekly`, `monthly`, `quarterly` |
| `deadline` | no | `YYYY-MM-DD` (also reads `7/20/2026`, "Jan 5 2026", etc.) |
| `assignees` | no | Names separated by commas — wrap in quotes if more than one |

\* If left blank, the import uses the company and track you're currently viewing, and
the first phase of that track. Rows with **no title are skipped** and reported.

### The review step

Nothing is written until you click Import. The review screen shows:
- how many tasks are **ready**, **skipped** (with the reason), and **auto-adjusted**
  (e.g. a misspelled priority defaulted to medium, or a date reformatted),
- a table preview of exactly what will be created.

Column names are flexible — `Task`/`Name`/`Item` all map to title, `Client`/`Account`
to company, `Due Date`/`When` to deadline, `Owner`/`Assigned To` to assignees, and so on.

---

## Other changes in this build

- **Edit any task** after creating it (title, phase, status, priority, cadence,
  deadline, assignees) from the task drawer, plus a **Delete task** button.
- **Assign team members** when creating a task, not just afterward.
- **Completion tracking**: marking a task Done stamps who finished it and when —
  shown as a "Done by …" badge on the board and in the drawer.
- **Phase selection** when adding a task, so new tasks no longer default to Phase 1.
- **Calendar** now shows every dated task, lets you click a task to open it, and has
  an "unscheduled" tray for board tasks that still need a deadline.

---

## Required database change (one time)

The "Done by" feature needs two new columns. In Supabase → **SQL Editor** → **New query**,
paste the contents of **`supabase/03_completed_by.sql`** and click **Run**. That's it —
the import feature and everything else needs no database changes.
