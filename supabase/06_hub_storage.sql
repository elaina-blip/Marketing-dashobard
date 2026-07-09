-- ============================================================================
-- 06_hub_storage.sql — Storage policies for the "hub" bucket
-- Run this AFTER you've created the "hub" bucket in Storage (see step-by-step).
-- Lets any signed-in user read/upload/delete objects in the "hub" bucket only.
-- This mirrors how your task-attachment uploads already work.
-- ============================================================================

-- Read objects in the hub bucket
drop policy if exists "hub read" on storage.objects;
create policy "hub read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'hub');

-- Upload objects to the hub bucket
drop policy if exists "hub insert" on storage.objects;
create policy "hub insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'hub');

-- Update objects in the hub bucket
drop policy if exists "hub update" on storage.objects;
create policy "hub update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'hub')
  with check (bucket_id = 'hub');

-- Delete objects in the hub bucket
drop policy if exists "hub delete" on storage.objects;
create policy "hub delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'hub');
