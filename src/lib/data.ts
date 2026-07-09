import { createClient } from "@/lib/supabase-browser";

const supabase = createClient();

export type Task = {
  id: string; company_id: string; track: "seo" | "paid_social";
  phase: string; title: string; why?: string; cadence?: string; tools?: string;
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "blocked" | "done";
  deadline?: string | null; platform?: string | null; recurring: boolean;
  completed_by?: string | null; completed_at?: string | null;
  assignees: string[];
  notes: { id: string; author: string; body: string; created_at: string }[];
  attachments: Attachment[];
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
  const allowed = ["status", "priority", "deadline", "title", "why", "tools", "cadence", "phase", "completed_by", "completed_at"];
  const clean: any = {};
  for (const k of allowed) if (k in patch) clean[k] = (patch as any)[k];
  if (Object.keys(clean).length) await supabase.from("tasks").update(clean).eq("id", id);
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function createTask(input: NewTaskInput) {
  const { data: maxRows } = await supabase.from("tasks").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sort_order = (maxRows?.[0]?.sort_order ?? -1) + 1;

  const payload = {
    company_id: input.company_id,
    track: input.track,
    phase: input.phase,
    title: input.title,
    priority: input.priority ?? "medium",
    status: input.status ?? "not_started",
    cadence: input.cadence ?? "one-time",
    deadline: input.deadline || null,
    recurring: input.recurring ?? false,
    sort_order,
  };

  const { data, error } = await supabase.from("tasks").insert(payload).select().single();
  if (error) throw error;

  const names = (input.assignees || []).filter(Boolean);
  if (data && names.length) {
    await supabase.from("task_assignees").insert(names.map(name => ({ task_id: data.id, name })));
  }
  return data;
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
