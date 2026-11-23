-- Authenticated users may upload only into their own business/user receipt path.
-- The server also validates the day lock, MIME bytes and expense-link state.
create policy tracker_insert_receipt on storage.objects for insert to authenticated
  with check (
    bucket_id='receipts'
    and split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and split_part(name,'/',2)=auth.uid()::text
    and tracker_private.member_role((split_part(name,'/',1))::uuid) is not null
  );

-- Never allow replacement or deletion through a regular staff session.
create policy tracker_owner_replaces_receipt on storage.objects for update to authenticated
  using (
    bucket_id='receipts'
    and split_part(name,'/',2)=auth.uid()::text
  )
  with check (
    bucket_id='receipts'
    and split_part(name,'/',2)=auth.uid()::text
  );

create policy tracker_owner_deletes_receipt on storage.objects for delete to authenticated
  using (
    bucket_id='receipts'
    and split_part(name,'/',2)=auth.uid()::text
  );
