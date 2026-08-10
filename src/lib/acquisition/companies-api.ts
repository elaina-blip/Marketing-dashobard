/**
 * companies-api.ts
 * -----------------------------------------------------------------------------
 * The queue, the plan and the snapshots — everything the working tabs read and
 * write. The supplied files covered documents and the pure algorithms; this is
 * the rest of the data layer.
 *
 * Uses the same browser client as src/lib/data.ts, so every call runs as the
 * signed-in user and RLS (acq_is_team) decides what they may touch.
 * -----------------------------------------------------------------------------
 */

import { createClient } from "@/lib/supabase-browser";
import type { CompanyRow, PlanRow, Stage } from "./acquisition-logic";

const supabase = createClient();

export const COMPANY_COLUMNS =
  "id, company_name, vertical, total_permits, priority_score, state, metro, " +
  "primary_jurisdiction, permit_types, email, records_on_domain, stage, " +
  "fb_found, ig_found, li_found, fb_followed, ig_followed, li_followed, " +
  "fb_back, ig_back, li_back, engagements, notes, researched_by, researched_on, " +
  "recheck, last_seen_in_upload";

export const today = () => new Date().toISOString().slice(0, 10);

/* ========================== companies ========================== */

/**
 * The whole queue. Supabase caps a select at 1000 rows by default, and a year of
 * uploads runs well past that, so page through until a short page comes back.
 */
export async function loadCompanies(): Promise<CompanyRow[]> {
  const PAGE = 1000;
  const out: CompanyRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("acquisition_companies")
      .select(COMPANY_COLUMNS)
      .order("priority_score", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as unknown as CompanyRow[];
    out.push(...batch);
    if (batch.length < PAGE) return out;
  }
}

export type CompanyPatch = Partial<Omit<CompanyRow, "id">>;

export async function updateCompany(id: string, patch: CompanyPatch): Promise<void> {
  const { error } = await supabase.from("acquisition_companies").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Bulk actions. Chunked because `in` lists get unwieldy at a few thousand ids. */
export async function updateCompanies(ids: string[], patch: CompanyPatch): Promise<void> {
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await supabase
      .from("acquisition_companies").update(patch).in("id", ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }
}

export async function setStage(ids: string[], stage: Stage): Promise<void> {
  await updateCompanies(ids, { stage });
}

/* ========================== plan ========================== */

export async function loadPlan(): Promise<PlanRow[]> {
  const { data, error } = await supabase
    .from("acquisition_plan")
    .select("vertical, research_per_month, fb_rate, ig_rate, li_rate")
    .order("vertical");
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanRow[];
}

export async function savePlanRow(
  vertical: string,
  patch: Partial<Omit<PlanRow, "vertical">>,
  updatedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from("acquisition_plan")
    .update({ ...patch, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq("vertical", vertical);
  if (error) throw new Error(error.message);
}

/* ========================== snapshots ========================== */

export interface SnapshotRow {
  month_tag: string;
  vertical: string;
  researched: number;
  fb_found: number;
  ig_found: number;
  li_found: number;
  followed: number;
  follow_backs: number;
  engagements: number;
}

/** Closed months. Trends reads these so history survives archiving. */
export async function loadSnapshots(): Promise<SnapshotRow[]> {
  const { data, error } = await supabase
    .from("acquisition_snapshots")
    .select("month_tag, vertical, researched, fb_found, ig_found, li_found, followed, follow_backs, engagements")
    .order("month_tag");
  if (error) throw new Error(error.message);
  return (data ?? []) as SnapshotRow[];
}

export { snapshotMonth } from "./documents-api";
export { supabase as acquisitionClient };
