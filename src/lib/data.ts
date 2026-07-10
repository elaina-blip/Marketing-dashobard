import { createClient } from "@/lib/supabase-browser";

const supabase = createClient();

export type Task = {
  id: string; company_id: string; track: "seo" | "paid_social";
  phase: string; title: string; why?: string; cadence?: string; tools?: string;
  caption?: string | null;
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "blocked" | "done";
  deadline?: string | null; platform?: string | null; recurring: boolean;
  completed_by?: string | null; completed_at?: string | null;
  assignees: string[];
  notes: { id: string; author: string; body: string; created_at: string }[];
  attachments: Attachment[];
};

export type RepeatSpec = {
  freq: "daily" | "weekly" | "monthly";
  // For weekly: which weekdays (0=Sun … 6=Sat). If empty, uses the start date's weekday.
  weekdays?: number[];
  // How many occurrences to generate (bounded). Defaults applied in createTask.
  count?: number;
};

export type NewTaskInput = {
  company_id: string;
  track: "seo" | "paid_social";
  phase: string;
  title: string;
  priority?: Task["priority"];
  status?: Task["status"];
  cadence?: Task["cadence"];
  deadline?: string | null;
  recurring?: boolean;
  assignees?: string[];
  repeat?: RepeatSpec | null;   // when set, createTask generates the series
};

export type Attachment = {
  id: string; task_id: string; kind: "file" | "link";
  name: string; url?: string; storage_path?: string; mime?: string;
  size?: number; added_by?: string; created_at: string;
};

export type CompanyLoginRow = {
  media: string;
  username: string;
  password: string;
};

// ---- Load everything in scope, stitched into Task objects ----
export async function loadTasks(): Promise<Task[]> {
  const [{ data: tasks }, { data: assignees }, { data: notes }, { data: atts }] =
    await Promise.all([
      supabase.from("tasks").select("*").order("sort_order"),
      supabase.from("task_assignees").select("*"),
      supabase.from("notes").select("*").order("created_at"),
      supabase.from("attachments").select("*").order("created_at"),
    ]);

  const byTask = (arr: any[] | null, id: string) => (arr || []).filter(r => r.task_id === id);

  return (tasks || []).map((t: any) => ({
    ...t,
    assignees: byTask(assignees, t.id).map((a: any) => a.name),
    notes: byTask(notes, t.id),
    attachments: byTask(atts, t.id),
  }));
}

// ---- Task field updates ----
export async function updateTask(id: string, patch: Partial<Task>) {
  const allowed = ["status", "priority", "deadline", "title", "why", "tools", "cadence", "phase", "completed_by", "completed_at", "caption"];
  const clean: any = {};
  for (const k of allowed) if (k in patch) clean[k] = (patch as any)[k];
  if (Object.keys(clean).length) await supabase.from("tasks").update(clean).eq("id", id);
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// Delete many tasks at once (cascades to assignees/notes/attachments via FK).
export async function deleteTasks(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from("tasks").delete().in("id", ids);
  if (error) throw error;
}

// Generate the list of ISO dates for a recurring series, starting from `startISO`.
// Bounded so we never create a runaway number of rows.
function expandRecurrence(startISO: string, repeat: RepeatSpec): string[] {
  const MAX = 260;                       // hard ceiling (e.g. ~1 year of weekdays)
  const HORIZON_DAYS = 366;              // don't schedule further than ~1 year out
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [y, m, d] = startISO.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const horizon = new Date(start); horizon.setDate(horizon.getDate() + HORIZON_DAYS);
  const want = Math.min(repeat.count ?? defaultCount(repeat.freq), MAX);
  const out: string[] = [];

  if (repeat.freq === "daily") {
    const cur = new Date(start);
    while (out.length < want && cur <= horizon) { out.push(iso(cur)); cur.setDate(cur.getDate() + 1); }
  } else if (repeat.freq === "weekly") {
    // Which weekdays to hit each week; default to the start date's own weekday.
    const days = (repeat.weekdays && repeat.weekdays.length) ? [...repeat.weekdays].sort((a, b) => a - b) : [start.getDay()];
    // Walk week by week from the Sunday of the start week, emitting matching days that are >= start.
    const weekStart = new Date(start); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    while (out.length < want && weekStart <= horizon) {
      for (const wd of days) {
        const day = new Date(weekStart); day.setDate(day.getDate() + wd);
        if (day >= start && day <= horizon && out.length < want) out.push(iso(day));
      }
      weekStart.setDate(weekStart.getDate() + 7);
    }
    out.sort();
  } else { // monthly — same day-of-month each month, clamped to each month's length
    const targetDay = start.getDate();
    for (let k = 0; out.length < want; k++) {
      const cand = new Date(start.getFullYear(), start.getMonth() + k, 1);
      const lastDay = new Date(cand.getFullYear(), cand.getMonth() + 1, 0).getDate();
      cand.setDate(Math.min(targetDay, lastDay));
      if (cand > horizon) break;
      out.push(iso(cand));
    }
  }
  return out;
}
function defaultCount(freq: RepeatSpec["freq"]): number {
  if (freq === "daily") return 30;      // ~a month of days
  if (freq === "weekly") return 12;     // ~3 months of weeks (per selected weekday)
  return 6;                             // ~6 months of months
}

export async function createTask(input: NewTaskInput) {
  const { data: maxRows } = await supabase.from("tasks").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  let sort_order = (maxRows?.[0]?.sort_order ?? -1) + 1;

  const base = {
    company_id: input.company_id,
    track: input.track,
    phase: input.phase,
    title: input.title,
    priority: input.priority ?? "medium",
    status: input.status ?? "not_started",
    cadence: input.cadence ?? "one-time",
    recurring: input.recurring ?? false,
  };
  const names = (input.assignees || []).filter(Boolean);

  // ---- Recurring: expand into a dated series ----
  if (input.repeat && input.deadline) {
    const dates = expandRecurrence(input.deadline, input.repeat);
    const cadence = input.repeat.freq === "daily" ? "weekly" : input.repeat.freq; // schema cadence has no "daily"
    const payload = dates.map(dl => ({ ...base, cadence, recurring: true, deadline: dl, sort_order: sort_order++ }));
    const { data: inserted, error } = await supabase.from("tasks").insert(payload).select("id");
    if (error) throw error;
    if (names.length && inserted?.length) {
      const rows: { task_id: string; name: string }[] = [];
      for (const r of inserted) for (const name of names) rows.push({ task_id: (r as any).id, name });
      await supabase.from("task_assignees").insert(rows);
    }
    return inserted?.[0] ?? null;
  }

  // ---- Single task ----
  const payload = { ...base, deadline: input.deadline || null, sort_order };
  const { data, error } = await supabase.from("tasks").insert(payload).select().single();
  if (error) throw error;
  if (data && names.length) {
    await supabase.from("task_assignees").insert(names.map(name => ({ task_id: data.id, name })));
  }
  return data;
}

// ============================================================
//  BULK IMPORT — take a parsed list of tasks and insert them all.
// ============================================================
export type ImportRow = {
  company_id: string;
  track: "seo" | "paid_social";
  phase: string;
  title: string;
  priority?: Task["priority"];
  status?: Task["status"];
  cadence?: Task["cadence"];
  deadline?: string | null;
  assignees?: string[];
};

// Insert many tasks at once (plus their assignees). Returns how many were created.
export async function importTasks(rows: ImportRow[]): Promise<number> {
  if (!rows.length) return 0;

  const { data: maxRows } = await supabase.from("tasks").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  let order = (maxRows?.[0]?.sort_order ?? -1) + 1;

  const payload = rows.map(r => ({
    company_id: r.company_id,
    track: r.track,
    phase: r.phase,
    title: r.title,
    priority: r.priority ?? "medium",
    status: r.status ?? "not_started",
    cadence: r.cadence ?? "one-time",
    deadline: r.deadline || null,
    recurring: false,
    sort_order: order++,
  }));

  const { data: inserted, error } = await supabase.from("tasks").insert(payload).select("id");
  if (error) throw error;

  // Wire up assignees for any rows that had them (matched back by position).
  const assigneeRows: { task_id: string; name: string }[] = [];
  (inserted || []).forEach((row: any, i: number) => {
    for (const name of (rows[i].assignees || []).filter(Boolean)) {
      assigneeRows.push({ task_id: row.id, name });
    }
  });
  if (assigneeRows.length) {
    await supabase.from("task_assignees").insert(assigneeRows);
  }

  return (inserted || []).length;
}

// ---- Assignees ----
export async function setAssignee(taskId: string, name: string, on: boolean) {
  if (on) await supabase.from("task_assignees").insert({ task_id: taskId, name });
  else    await supabase.from("task_assignees").delete().eq("task_id", taskId).eq("name", name);
}

// ---- Notes ----
export async function addNote(taskId: string, author: string, body: string) {
  const { data } = await supabase.from("notes")
    .insert({ task_id: taskId, author, body }).select().single();
  return data;
}

// ---- Attachments: links ----
export async function addLink(taskId: string, name: string, url: string, addedBy: string) {
  const { data } = await supabase.from("attachments")
    .insert({ task_id: taskId, kind: "link", name, url, added_by: addedBy }).select().single();
  return data;
}

// ---- Attachments: file upload to Storage ----
export async function uploadFile(taskId: string, file: File, addedBy: string) {
  const path = `${taskId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage
    .from("task-attachments").upload(path, file);
  if (upErr) throw upErr;
  const { data } = await supabase.from("attachments").insert({
    task_id: taskId, kind: "file", name: file.name, storage_path: path,
    mime: file.type, size: file.size, added_by: addedBy,
  }).select().single();
  return data;
}

// signed URL to open/download a stored file
export async function fileUrl(storagePath: string) {
  const { data } = await supabase.storage
    .from("task-attachments").createSignedUrl(storagePath, 3600);
  return data?.signedUrl;
}

export async function removeAttachment(att: Attachment) {
  if (att.kind === "file" && att.storage_path)
    await supabase.storage.from("task-attachments").remove([att.storage_path]);
  await supabase.from("attachments").delete().eq("id", att.id);
}

export async function getTeam(): Promise<string[]> {
  const { data } = await supabase.from("allowed_users").select("name").order("name");
  return (data || []).map((u: any) => u.name).filter(Boolean);
}

export async function currentEmail(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email || "Someone";
}

// Display name of the signed-in user (from the allow-list), falling back to email.
export async function currentName(): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email || "";
  if (!email) return "Someone";
  const { data } = await supabase
    .from("allowed_users")
    .select("name")
    .ilike("email", email)
    .maybeSingle();
  return (data as any)?.name || email;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}

export async function loadCompanyLogins(): Promise<Record<string, CompanyLoginRow[]>> {
  const { data, error } = await supabase
    .from("company_logins")
    .select("company_id, media, username, password, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const rowsByCompany: Record<string, CompanyLoginRow[]> = { aps: [], ads: [], tgr: [] };
  for (const row of data || []) {
    const key = row.company_id;
    if (!rowsByCompany[key]) rowsByCompany[key] = [];
    rowsByCompany[key].push({
      media: row.media || "",
      username: row.username || "",
      password: row.password || "",
    });
  }
  return rowsByCompany;
}

export async function replaceCompanyLogins(companyId: string, rows: CompanyLoginRow[]) {
  await supabase.from("company_logins").delete().eq("company_id", companyId);

  if (!rows.length) return;

  const payload = rows.map((row, idx) => ({
    company_id: companyId,
    media: row.media,
    username: row.username,
    password: row.password,
    sort_order: idx,
  }));

  const { error } = await supabase.from("company_logins").insert(payload);
  if (error) throw error;
}

// ---- Data-source connections (Integrations & Data) ----
export type ConnectionStatus = "disconnected" | "pending" | "connected" | "error";
export type Connection = {
  provider: string;
  status: ConnectionStatus;
  account_label?: string | null;
  last_synced_at?: string | null;
  error_detail?: string | null;
};

// Reads only the safe status columns — never tokens (those live in a
// server-only table the browser key cannot access).
export async function loadConnections(): Promise<Record<string, Connection>> {
  const { data, error } = await supabase
    .from("data_connections")
    .select("provider, status, account_label, last_synced_at, error_detail");
  if (error) throw error;
  const map: Record<string, Connection> = {};
  for (const row of data || []) map[(row as any).provider] = row as Connection;
  return map;
}

// Disconnect is a server action (clears tokens + sets status). The browser
// cannot write these tables directly, so we route through the API.
export async function disconnectSource(provider: string): Promise<void> {
  const res = await fetch(`/api/oauth/${encodeURIComponent(provider)}/disconnect`, { method: "POST" });
  if (!res.ok) throw new Error("disconnect failed");
}

// ---- Provider metrics (what the dashboard/reports read) ----
export type MetricRow = { provider: string; metric: string; metric_date: string; value: number };

// Load metric rows, optionally filtered to a set of providers and/or a start date
// (ISO yyyy-mm-dd). Returns rows sorted by date ascending, chart-ready.
export async function loadMetrics(opts?: { providers?: string[]; since?: string }): Promise<MetricRow[]> {
  let q = supabase.from("provider_metrics").select("provider, metric, metric_date, value");
  if (opts?.providers && opts.providers.length) q = q.in("provider", opts.providers);
  if (opts?.since) q = q.gte("metric_date", opts.since);
  const { data, error } = await q.order("metric_date", { ascending: true });
  if (error) throw error;
  return (data || []) as MetricRow[];
}

// Sum a single metric across a provider list within the last N days.
// Returns { total, prevTotal, series } so a card can show a value, a trend %,
// and a sparkline without every view re-implementing the math.
export type MetricSummary = { total: number; prevTotal: number; changePct: number | null; series: { date: string; value: number }[] };
export function summarizeMetric(rows: MetricRow[], metric: string, days = 28): MetricSummary {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - (days - 1));
  const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const s = iso(start), ps = iso(prevStart);
  const byDate: Record<string, number> = {};
  let total = 0, prevTotal = 0;
  for (const r of rows) {
    if (r.metric !== metric) continue;
    if (r.metric_date >= s) { total += Number(r.value) || 0; byDate[r.metric_date] = (byDate[r.metric_date] || 0) + (Number(r.value) || 0); }
    else if (r.metric_date >= ps) { prevTotal += Number(r.value) || 0; }
  }
  const series = Object.keys(byDate).sort().map(date => ({ date, value: byDate[date] }));
  const changePct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
  return { total, prevTotal, changePct, series };
}

// ============================================================================
// MARKETING HUB — files, contacts, brand assets, templates
// Uses the "hub" Storage bucket + hub_* tables (see 05_hub.sql / 06_hub_storage.sql).
// Same patterns as attachments above: upload to Storage, keep metadata in a table.
// ============================================================================

// ---- Files (spreadsheets, PDFs) ----
export type HubFile = {
  id: string; company_id: string; name: string; kind: string;
  storage_path: string; size_bytes: number | null; created_by: string | null;
  folder_id: string | null; created_at: string;
};

export type HubFolder = {
  id: string; company_id: string; name: string; parent_id: string | null;
  created_by: string | null; created_at: string;
};

export async function loadHubFiles(): Promise<HubFile[]> {
  const { data } = await supabase.from("hub_files").select("*").order("created_at", { ascending: false });
  return (data || []) as HubFile[];
}

// Detect kind from the filename so the UI shows the right icon.
function hubKind(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv") || n.endsWith(".tsv")) return "sheet";
  return "file";
}

export async function uploadHubFile(companyId: string, file: File, createdBy: string, folderId?: string | null): Promise<HubFile> {
  const path = `files/${companyId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from("hub").upload(path, file);
  if (upErr) throw upErr;
  const { data, error } = await supabase.from("hub_files").insert({
    company_id: companyId, name: file.name, kind: hubKind(file.name),
    storage_path: path, size_bytes: file.size, created_by: createdBy,
    folder_id: folderId ?? null,
  }).select().single();
  if (error) throw error;
  return data as HubFile;
}

export async function hubFileUrl(storagePath: string): Promise<string | undefined> {
  const { data } = await supabase.storage.from("hub").createSignedUrl(storagePath, 3600);
  return data?.signedUrl;
}

export async function deleteHubFile(f: HubFile) {
  if (f.storage_path) await supabase.storage.from("hub").remove([f.storage_path]);
  await supabase.from("hub_files").delete().eq("id", f.id);
}

// Reassign a file to a different company (or "all").
export async function setHubFileCompany(id: string, companyId: string) {
  const { error } = await supabase.from("hub_files").update({ company_id: companyId }).eq("id", id);
  if (error) throw error;
}

// Rename a file (its display name only; the stored blob path is unchanged).
export async function renameHubFile(id: string, name: string) {
  const { error } = await supabase.from("hub_files").update({ name }).eq("id", id);
  if (error) throw error;
}

// ---- Folders (organize files) ----
export async function loadHubFolders(): Promise<HubFolder[]> {
  const { data } = await supabase.from("hub_folders").select("*").order("name");
  return (data || []) as HubFolder[];
}

export async function createHubFolder(companyId: string, name: string, createdBy?: string, parentId?: string | null): Promise<HubFolder> {
  const { data, error } = await supabase.from("hub_folders").insert({
    company_id: companyId, name, created_by: createdBy || null, parent_id: parentId ?? null,
  }).select().single();
  if (error) throw error;
  return data as HubFolder;
}

export async function renameHubFolder(id: string, name: string) {
  const { error } = await supabase.from("hub_folders").update({ name }).eq("id", id);
  if (error) throw error;
}

// Move a folder under another folder (or null for top level). The caller is
// responsible for not creating a cycle (moving a folder into its own subtree);
// the UI enforces that with a descendant check before calling this.
export async function setHubFolderParent(id: string, parentId: string | null) {
  const { error } = await supabase.from("hub_folders").update({ parent_id: parentId }).eq("id", id);
  if (error) throw error;
}

// Deleting a folder does not delete its files or subfolders. Files fall back to
// the top level, and any child folders move up to this folder's own parent, so
// nothing is lost. (The FK is ON DELETE SET NULL; we also update eagerly so the
// UI reflects it immediately.)
export async function deleteHubFolder(id: string) {
  // Find this folder's parent so children can inherit it, keeping the tree tidy.
  const { data: self } = await supabase.from("hub_folders").select("parent_id").eq("id", id).single();
  const newParent = (self as any)?.parent_id ?? null;
  await supabase.from("hub_files").update({ folder_id: null }).eq("folder_id", id);
  await supabase.from("hub_folders").update({ parent_id: newParent }).eq("parent_id", id);
  const { error } = await supabase.from("hub_folders").delete().eq("id", id);
  if (error) throw error;
}

// Move a file into a folder, or pass null to move it back to the top level.
export async function setHubFileFolder(fileId: string, folderId: string | null) {
  const { error } = await supabase.from("hub_files").update({ folder_id: folderId }).eq("id", fileId);
  if (error) throw error;
}

// ---- Contacts ----
export type HubContact = {
  id: string; company_id: string; name: string; role: string | null;
  contact_type: string | null; email: string | null; phone: string | null;
  notes: string | null; created_at: string;
};

export async function loadContacts(): Promise<HubContact[]> {
  const { data } = await supabase.from("hub_contacts").select("*").order("name");
  return (data || []) as HubContact[];
}

export async function createContact(c: {
  company_id: string; name: string; role?: string; contact_type?: string;
  email?: string; phone?: string; notes?: string;
}): Promise<HubContact> {
  const { data, error } = await supabase.from("hub_contacts").insert({
    company_id: c.company_id, name: c.name, role: c.role || null,
    contact_type: c.contact_type || null, email: c.email || null,
    phone: c.phone || null, notes: c.notes || null,
  }).select().single();
  if (error) throw error;
  return data as HubContact;
}

export async function deleteContact(id: string) {
  await supabase.from("hub_contacts").delete().eq("id", id);
}

// Reassign a contact to a different company (or "all").
export async function setContactCompany(id: string, companyId: string) {
  const { error } = await supabase.from("hub_contacts").update({ company_id: companyId }).eq("id", id);
  if (error) throw error;
}

// ---- Brand assets (logos, colors, fonts, voice) ----
export type BrandAsset = {
  id: string; company_id: string; asset_type: string; label: string | null;
  value: string | null; storage_path: string | null; sort_order: number; created_at: string;
};

export async function loadBrandAssets(): Promise<BrandAsset[]> {
  const { data } = await supabase.from("hub_brand_assets").select("*")
    .order("company_id").order("asset_type").order("sort_order");
  return (data || []) as BrandAsset[];
}

// Save a text asset (color hex, font name, voice/tagline). No file involved.
export async function saveBrandAsset(a: {
  company_id: string; asset_type: string; label?: string; value?: string; sort_order?: number;
}): Promise<BrandAsset> {
  const { data, error } = await supabase.from("hub_brand_assets").insert({
    company_id: a.company_id, asset_type: a.asset_type, label: a.label || null,
    value: a.value ?? null, sort_order: a.sort_order ?? 0,
  }).select().single();
  if (error) throw error;
  return data as BrandAsset;
}

// Upload a logo image and record it as a brand asset.
export async function uploadBrandLogo(companyId: string, file: File, label?: string): Promise<BrandAsset> {
  const path = `brand/${companyId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from("hub").upload(path, file);
  if (upErr) throw upErr;
  const { data, error } = await supabase.from("hub_brand_assets").insert({
    company_id: companyId, asset_type: "logo", label: label || file.name, storage_path: path,
  }).select().single();
  if (error) throw error;
  return data as BrandAsset;
}

export async function brandAssetUrl(storagePath: string): Promise<string | undefined> {
  const { data } = await supabase.storage.from("hub").createSignedUrl(storagePath, 3600);
  return data?.signedUrl;
}

export async function deleteBrandAsset(a: BrandAsset) {
  if (a.storage_path) await supabase.storage.from("hub").remove([a.storage_path]);
  await supabase.from("hub_brand_assets").delete().eq("id", a.id);
}

// ---- Templates ----
export type HubTemplate = {
  id: string; company_id: string; category: string; title: string;
  body: string | null; created_at: string;
};

export async function loadTemplates(): Promise<HubTemplate[]> {
  const { data } = await supabase.from("hub_templates").select("*").order("created_at", { ascending: false });
  return (data || []) as HubTemplate[];
}

export async function saveTemplate(t: {
  company_id?: string; category: string; title: string; body?: string;
}): Promise<HubTemplate> {
  const { data, error } = await supabase.from("hub_templates").insert({
    company_id: t.company_id || "all", category: t.category, title: t.title, body: t.body || null,
  }).select().single();
  if (error) throw error;
  return data as HubTemplate;
}

export async function deleteTemplate(id: string) {
  await supabase.from("hub_templates").delete().eq("id", id);
}

// Reassign a template to a different company (or "all").
export async function setTemplateCompany(id: string, companyId: string) {
  const { error } = await supabase.from("hub_templates").update({ company_id: companyId }).eq("id", id);
  if (error) throw error;
}
