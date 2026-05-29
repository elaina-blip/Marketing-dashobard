import { createClient } from "@/lib/supabase-browser";

const supabase = createClient();

export type Task = {
  id: string; company_id: string; track: "seo" | "paid_social";
  phase: string; title: string; why?: string; cadence?: string; tools?: string;
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "blocked" | "done";
  deadline?: string | null; platform?: string | null; recurring: boolean;
  assignees: string[];
  notes: { id: string; author: string; body: string; created_at: string }[];
  attachments: Attachment[];
};

export type Attachment = {
  id: string; task_id: string; kind: "file" | "link";
  name: string; url?: string; storage_path?: string; mime?: string;
  size?: number; added_by?: string; created_at: string;
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
  const allowed = ["status", "priority", "deadline", "title", "why", "tools", "cadence"];
  const clean: any = {};
  for (const k of allowed) if (k in patch) clean[k] = (patch as any)[k];
  if (Object.keys(clean).length) await supabase.from("tasks").update(clean).eq("id", id);
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

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
