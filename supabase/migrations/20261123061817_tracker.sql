-- Authenticated clients read through RLS. All business writes go through the
-- narrow RPC at the end of this migration. Keep tracker_private unexposed.
create schema tracker_private;
revoke all on schema tracker_private from public, anon, authenticated;
grant usage on schema tracker_private to authenticated;
alter default privileges in schema tracker_private revoke execute on functions from public;

create table public.profiles (
  id uuid primary key references auth.users(id),
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  phone text check (length(phone) <= 40),
  address text check (length(address) <= 500),
  gstin text check (gstin ~ '^[0-9A-Z]{15}$'),
  timezone text not null default 'Asia/Kolkata' check (timezone = 'Asia/Kolkata'),
  currency text not null default 'INR' check (currency = 'INR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses,
  user_id uuid not null references public.profiles,
  role text not null check (role in ('owner','manager','staff','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,user_id)
);
create index membership_user_business on public.business_memberships(user_id,business_id) where active;
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses,
  name text not null check (length(trim(name)) between 1 and 80),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,id)
);
create unique index unique_category_name on public.expense_categories(business_id,lower(trim(name)));
create table public.daily_sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses,
  business_date date not null check (isfinite(business_date)),
  cash_collected numeric(12,2) not null check (cash_collected between 0 and 9999999999.99),
  upi_collected numeric(12,2) not null check (upi_collected between 0 and 9999999999.99),
  opening_float numeric(12,2) not null default 0 check (opening_float between 0 and 9999999999.99),
  notes text check (length(notes) <= 2000),
  version integer not null default 1,
  recorded_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,business_date)
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses,
  business_date date not null check (isfinite(business_date)),
  category_id uuid not null,
  amount numeric(12,2) not null check (amount between 0 and 9999999999.99),
  payment_method text not null check (payment_method in ('cash','upi','bank_transfer','other')),
  payment_status text not null check (payment_status in ('paid','pending','due')),
  vendor_name text check (length(vendor_name) <= 160),
  quantity numeric(12,3) check (quantity between 0 and 999999999.999),
  unit text check (length(unit) <= 32),
  notes text check (length(notes) <= 2000),
  receipt_path text,
  voided_at timestamptz,
  version integer not null default 1,
  recorded_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id,category_id) references public.expense_categories(business_id,id)
);
create index expense_day on public.expenses(business_id,business_date,id);
create index expense_category_day on public.expenses(business_id,category_id,business_date) where voided_at is null;
create unique index unique_expense_receipt on public.expenses(receipt_path) where receipt_path is not null;
create table public.petty_cash_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses,
  business_date date not null check (isfinite(business_date)),
  transaction_type text not null check (transaction_type in ('cash_in','cash_out')),
  amount numeric(12,2) not null check (amount > 0 and amount <= 9999999999.99),
  notes text not null check (length(trim(notes)) between 1 and 2000),
  recorded_by uuid not null references public.profiles,
  created_at timestamptz not null default now()
);
create index ledger_day on public.petty_cash_ledger(business_id,business_date);
create table public.cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses,
  business_date date not null check (isfinite(business_date)),
  -- Snapshot at the time of the count. Live expectation is recalculated
  -- from today's ledger when additional expenses are entered.
  expected_amount numeric(22,2) not null,
  actual_amount numeric(12,2) not null check (actual_amount between 0 and 9999999999.99),
  variance numeric(22,2) generated always as (actual_amount - expected_amount) stored,
  recorded_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,business_date)
);
create table public.daily_closings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses,
  business_date date not null check (isfinite(business_date)),
  status text not null check (status in ('locked','open')),
  locked_by uuid references public.profiles,
  locked_at timestamptz,
  reopened_by uuid references public.profiles,
  reopened_at timestamptz,
  reopen_reason text,
  unique (business_id,business_date)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses,
  actor_id uuid references public.profiles,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  reason text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_recent on public.audit_logs(business_id,created_at desc);
create table public.user_preferences (
  user_id uuid primary key references public.profiles,
  language text not null default 'en' check (language='en'),
  reminders_enabled boolean not null default true,
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create table tracker_private.requests (
  business_id uuid not null references public.businesses,
  actor_id uuid not null references public.profiles,
  request_id uuid not null,
  fingerprint text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (business_id,actor_id,request_id)
);
create table tracker_private.invite_attempts (
  business_id uuid not null references public.businesses,
  attempted_at timestamptz not null default now()
);
create index invite_window on tracker_private.invite_attempts(business_id,attempted_at);

-- GoTrue can set invited_at after inserting the user, in the same transaction.
-- Inspect the final row at commit. App metadata is writable only by Auth admins.
create function tracker_private.require_provisioned_account() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from auth.users where id=new.id and invited_at is null
    and (raw_app_meta_data->'staff_provisioned') is distinct from 'true'::jsonb) then
    raise exception 'A staff invitation is required';
  end if;
  return null;
end $$;
create constraint trigger tracker_invite_only after insert on auth.users
  deferrable initially deferred for each row execute function tracker_private.require_provisioned_account();

create function tracker_private.sync_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.email is not null then
    insert into public.profiles(id,email,full_name)
      values(new.id,new.email,left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),
        split_part(new.email,'@',1)),120))
      on conflict(id) do update set email=excluded.email,updated_at=now();
  end if;
  return new;
end $$;
create trigger tracker_auth_profile after insert or update of email on auth.users
  for each row execute function tracker_private.sync_profile();
insert into public.profiles(id,email,full_name)
  select id,email,left(coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),split_part(email,'@',1)),120)
  from auth.users where email is not null;

create function tracker_private.member_role(b uuid) returns text stable language sql security definer set search_path='' as $$
  select role from public.business_memberships where business_id=b and user_id=(select auth.uid()) and active
$$;
create function tracker_private.profile_visible(u uuid) returns boolean stable language sql security definer set search_path='' as $$
  select u=(select auth.uid()) or exists (
    select 1 from public.business_memberships me join public.business_memberships colleague using (business_id)
    where me.user_id=(select auth.uid()) and me.active and colleague.user_id=u)
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','businesses','business_memberships','expense_categories','daily_sales',
    'expenses','petty_cash_ledger','cash_reconciliations','daily_closings','audit_logs','user_preferences'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
  foreach t in array array['business_memberships','expense_categories','daily_sales','expenses','petty_cash_ledger',
    'cash_reconciliations','daily_closings'] loop
    execute format('create policy member_reads on public.%I for select to authenticated using (tracker_private.member_role(business_id) is not null)',t);
  end loop;
end $$;
create policy member_reads_business on public.businesses for select to authenticated using (tracker_private.member_role(id) is not null);
create policy colleague_read on public.profiles for select to authenticated using (tracker_private.profile_visible(id));
create policy owner_reads_audit on public.audit_logs for select to authenticated using (tracker_private.member_role(business_id)='owner');
create policy self_reads_preferences on public.user_preferences for select to authenticated using (user_id=(select auth.uid()));
alter table tracker_private.requests enable row level security;
alter table tracker_private.invite_attempts enable row level security;

create function tracker_private.audit_change() returns trigger language plpgsql set search_path='' as $$
declare
  prior jsonb;
  current_row jsonb;
  target jsonb;
  business uuid;
begin
  if tg_op <> 'INSERT' then prior := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then current_row := to_jsonb(new); end if;
  target := coalesce(current_row,prior);
  business := case when tg_table_name='businesses' then target->>'id' else target->>'business_id' end;
  insert into public.audit_logs(business_id,actor_id,entity_type,entity_id,action,reason,before_data,after_data)
  values(business,auth.uid(),tg_table_name,(target->>'id')::uuid,
    coalesce(nullif(current_setting('tracker.action',true),''),lower(tg_op)),
    nullif(current_setting('tracker.reason',true),''),prior,current_row);
  return null;
end $$;
do $$
declare t text;
begin
  foreach t in array array['businesses','business_memberships','expense_categories','daily_sales','expenses',
    'petty_cash_ledger','cash_reconciliations','daily_closings'] loop
    execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function tracker_private.audit_change()',t);
  end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values ('receipts','receipts',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']);
-- Trusted server validates size, bytes and MIME before upload. Readers may
-- sign only object names attached to an expense visible through RLS.
create policy tracker_read_linked_receipts on storage.objects for select to authenticated
  using (bucket_id='receipts' and exists(
    select 1 from public.expenses e where e.receipt_path=storage.objects.name));

create function tracker_private.money(field_value text) returns numeric language plpgsql immutable set search_path='' as $$
begin
  if field_value is null or field_value !~ '^[0-9]{1,10}([.][0-9]{1,2})?$' then
    raise exception 'Enter a non-negative amount with up to two decimal places';
  end if;
  return field_value::numeric;
end $$;
create function tracker_private.assert_revision(stored integer,d jsonb) returns void language plpgsql set search_path='' as $$
begin
  if coalesce((d->>'version')::integer,0) <> stored then
    raise exception 'This record has changed. Reload it before saving';
  end if;
  if stored > 0 and coalesce(length(trim(d->>'reason')),0) = 0 then
    raise exception 'A correction reason is required';
  end if;
end $$;
create function tracker_private.save_sales(b uuid,day date,d jsonb) returns uuid language plpgsql set search_path='' as $$
declare
  sale public.daily_sales;
  cash numeric := tracker_private.money(d->>'cash_collected');
  upi numeric := tracker_private.money(d->>'upi_collected');
  opening numeric := tracker_private.money(coalesce(d->>'opening_float','0'));
  expected numeric;
begin
  select * into sale from public.daily_sales where business_id=b and business_date=day;
  perform tracker_private.assert_revision(coalesce(sale.version,0),d);
  insert into public.daily_sales(business_id,business_date,cash_collected,upi_collected,opening_float,notes,recorded_by)
    values(b,day,cash,upi,opening,nullif(d->>'notes',''),auth.uid())
    on conflict (business_id,business_date) do update set
      cash_collected=excluded.cash_collected,upi_collected=excluded.upi_collected,
      opening_float=excluded.opening_float,notes=excluded.notes,version=public.daily_sales.version+1,updated_at=now()
    returning * into sale;
  if d ? 'actual_amount' then
    if nullif(d->>'actual_amount','') is null then
      delete from public.cash_reconciliations where business_id=b and business_date=day;
    else
      expected := opening+cash -
        (select coalesce(sum(amount),0) from public.expenses where business_id=b and business_date=day and voided_at is null
          and payment_status='paid' and payment_method='cash') +
        (select coalesce(sum(case transaction_type when 'cash_in' then amount else -amount end),0)
          from public.petty_cash_ledger where business_id=b and business_date=day);
      insert into public.cash_reconciliations(business_id,business_date,expected_amount,actual_amount,recorded_by)
        values(b,day,expected,tracker_private.money(d->>'actual_amount'),auth.uid())
        on conflict(business_id,business_date) do update set actual_amount=excluded.actual_amount,
          expected_amount=excluded.expected_amount,updated_at=now();
    end if;
  end if;
  return sale.id;
end $$;
create function tracker_private.save_expense(b uuid,day date,d jsonb,r text,action text) returns uuid language plpgsql set search_path='' as $$
declare
  original public.expenses;
  target_id uuid := nullif(d->>'id','')::uuid;
  category uuid;
  receipt text := nullif(d->>'receipt_path','');
  amount_value numeric;
  qty numeric;
begin
  if target_id is not null then
    select * into strict original from public.expenses where business_id=b and id=target_id for update;
    if original.voided_at is not null then raise exception 'This expense has been voided'; end if;
    if r='staff' and original.recorded_by<>auth.uid() then raise exception 'Only your own expenses can be corrected'; end if;
    perform tracker_private.assert_revision(original.version,d);
  else
    perform tracker_private.assert_revision(0,d);
  end if;
  if action='void_expense' then
    if target_id is null or r not in ('owner','manager') then raise exception 'Owner or manager access required'; end if;
    update public.expenses set voided_at=now(),updated_at=now(),version=version+1 where id=target_id;
    return target_id;
  end if;
  category := (d->>'category_id')::uuid;
  perform 1 from public.expense_categories where id=category and business_id=b and (active or id=original.category_id) for share;
  if not found then raise exception 'Choose an active expense category'; end if;
  if receipt is distinct from original.receipt_path and receipt is not null then
    if receipt !~ ('^'||b||'/'||auth.uid()||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|jpeg|png|webp|pdf)$')
      or not exists(select 1 from storage.objects where bucket_id='receipts' and name=receipt) then
      raise exception 'Upload the receipt before saving the expense';
    end if;
  end if;
  amount_value := tracker_private.money(d->>'amount');
  if nullif(d->>'quantity','') is not null then
    if (d->>'quantity') !~ '^[0-9]{1,9}([.][0-9]{1,3})?$' then raise exception 'Invalid quantity'; end if;
    qty := (d->>'quantity')::numeric;
  end if;
  if target_id is null then
    insert into public.expenses(business_id,business_date,category_id,amount,payment_method,payment_status,
      vendor_name,quantity,unit,notes,receipt_path,recorded_by)
      values(b,day,category,amount_value,d->>'payment_method',d->>'payment_status',
        nullif(d->>'vendor_name',''),qty,nullif(d->>'unit',''),nullif(d->>'notes',''),receipt,auth.uid())
      returning id into target_id;
  else
    update public.expenses set business_date=day,category_id=category,amount=amount_value,payment_method=d->>'payment_method',
      payment_status=d->>'payment_status',vendor_name=nullif(d->>'vendor_name',''),quantity=qty,unit=nullif(d->>'unit',''),
      notes=nullif(d->>'notes',''),receipt_path=receipt,updated_at=now(),version=version+1 where id=target_id;
  end if;
  return target_id;
end $$;
create function tracker_private.save_financial(b uuid,action text,d jsonb,r text) returns uuid language plpgsql set search_path='' as $$
declare
  day date;
  previous_day date;
  affected_day date;
  target_id uuid;
begin
  if r='viewer' then raise exception 'Read-only access'; end if;
  if (d->>'business_date') is null or (d->>'business_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'A valid business date is required';
  end if;
  day := (d->>'business_date')::date;
  if action in ('expense','void_expense') and nullif(d->>'id','') is not null then
    select business_date into strict previous_day from public.expenses where business_id=b and id=(d->>'id')::uuid;
  end if;
  -- Moving an expense obtains both date locks in the same order as competing
  -- edits. Revision checks reject any edit that changed the source meanwhile.
  for affected_day in select distinct value from unnest(array[day,previous_day]) value where value is not null order by value loop
    perform pg_advisory_xact_lock(hashtextextended(b::text||':'||affected_day::text,0));
    if action <> 'reopen' and exists(select 1 from public.daily_closings
      where business_id=b and business_date=affected_day and status='locked') then
      raise exception 'This business date is locked';
    end if;
  end loop;
  if previous_day is not null then
    perform 1 from public.expenses where business_id=b and id=(d->>'id')::uuid and business_date=previous_day for update;
    if not found then raise exception 'This record has moved. Reload it before saving'; end if;
  end if;
  case action
  when 'sales' then return tracker_private.save_sales(b,day,d);
  when 'expense','void_expense' then return tracker_private.save_expense(b,day,d,r,action);
  when 'adjustment' then
    insert into public.petty_cash_ledger(business_id,business_date,transaction_type,amount,notes,recorded_by)
    values(b,day,d->>'transaction_type',tracker_private.money(d->>'amount'),d->>'notes',auth.uid()) returning id into target_id;
  when 'lock' then
    if r not in ('owner','manager') then raise exception 'Owner or manager access required'; end if;
    insert into public.daily_closings(business_id,business_date,status,locked_by,locked_at)
      values(b,day,'locked',auth.uid(),now()) on conflict(business_id,business_date)
      do update set status='locked',locked_by=excluded.locked_by,locked_at=excluded.locked_at returning id into target_id;
  when 'reopen' then
    if r<>'owner' then raise exception 'Only the owner can reopen a day'; end if;
    if nullif(trim(d->>'reason'),'') is null then raise exception 'A reopening reason is required'; end if;
    update public.daily_closings set status='open',reopened_at=now(),reopened_by=auth.uid(),reopen_reason=trim(d->>'reason')
      where business_id=b and business_date=day and status='locked' returning id into target_id;
    if not found then raise exception 'This day is already open'; end if;
  else raise exception 'Unknown financial action';
  end case;
  return target_id;
end $$;

create function tracker_private.save_settings(b uuid,action text,d jsonb,r text) returns uuid language plpgsql set search_path='' as $$
declare
  target_id uuid;
  target_user uuid;
  existing_role text;
begin
  if action='preferences' then
    insert into public.user_preferences(user_id,reminders_enabled,notifications_enabled)
      values(auth.uid(),(d->>'reminders_enabled')::boolean,(d->>'notifications_enabled')::boolean)
      on conflict (user_id) do update set reminders_enabled=excluded.reminders_enabled,
        notifications_enabled=excluded.notifications_enabled,updated_at=now();
    return auth.uid();
  end if;
  if r<>'owner' then raise exception 'Owner access required'; end if;
  case action
  when 'business' then
    update public.businesses set name=trim(d->>'name'),phone=nullif(trim(d->>'phone'),''),
      address=nullif(trim(d->>'address'),''),gstin=nullif(upper(trim(d->>'gstin')),''),updated_at=now() where id=b;
    return b;
  when 'category' then
    if nullif(d->>'id','') is null then
      insert into public.expense_categories(business_id,name,color,active)
        values(b,trim(d->>'name'),d->>'color',coalesce((d->>'active')::boolean,true)) returning id into target_id;
    else
      update public.expense_categories set name=trim(d->>'name'),color=d->>'color',active=(d->>'active')::boolean,updated_at=now()
        where business_id=b and id=(d->>'id')::uuid returning id into strict target_id;
    end if;
  when 'member','member_email' then
    if action='member_email' then
      select id into target_user from auth.users where lower(email)=lower(trim(d->>'email')) and email is not null and deleted_at is null;
      if not found then raise exception 'Account not found'; end if;
    else
      target_user := (d->>'user_id')::uuid;
      if not exists(select 1 from public.business_memberships where business_id=b and user_id=target_user) then
        raise exception 'Staff member not found';
      end if;
    end if;
    select role into existing_role from public.business_memberships where business_id=b and user_id=target_user for update;
    if target_user=auth.uid() or existing_role='owner' or d->>'role' not in ('manager','staff','viewer') then
      raise exception 'Ownership cannot be changed here';
    end if;
    insert into public.business_memberships(business_id,user_id,role,active)
      values(b,target_user,d->>'role',coalesce((d->>'active')::boolean,true)) on conflict(business_id,user_id)
      do update set role=excluded.role,active=excluded.active,updated_at=now() returning id into target_id;
  else raise exception 'Unknown settings action';
  end case;
  return target_id;
end $$;

create function tracker_private.write_record(b uuid,action text,d jsonb,request uuid) returns jsonb
  language plpgsql security definer set search_path='' as $$
declare
  r text;
  fingerprint text;
  old_request tracker_private.requests;
  target_id uuid;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select role into r from public.business_memberships where business_id=b and user_id=auth.uid() and active for share;
  if not found then raise exception 'Business access required'; end if;
  if request is null or action is null or d is null or jsonb_typeof(d)<>'object' or length(d::text)>16384 then
    raise exception 'Invalid request';
  end if;
  if length(d->>'reason')>1000 then raise exception 'Correction reason is too long'; end if;
  perform pg_advisory_xact_lock(hashtextextended(b::text||auth.uid()::text||request::text,1));
  fingerprint := encode(sha256(convert_to(jsonb_build_array(action,d)::text,'UTF8')),'hex');
  select * into old_request from tracker_private.requests where business_id=b and actor_id=auth.uid() and request_id=request;
  if found then
    if old_request.fingerprint<>fingerprint then raise exception 'Request ID was already used with different values'; end if;
    return old_request.response;
  end if;
  perform set_config('tracker.action',action,true);
  perform set_config('tracker.reason',coalesce(trim(d->>'reason'),''),true);
  if action in ('sales','expense','void_expense','adjustment','lock','reopen') then
    target_id := tracker_private.save_financial(b,action,d,r);
  else
    target_id := tracker_private.save_settings(b,action,d,r);
  end if;
  result := jsonb_build_object('id',target_id);
  insert into tracker_private.requests(business_id,actor_id,request_id,fingerprint,response) values(b,auth.uid(),request,fingerprint,result);
  return result;
end $$;
create function public.tracker_write(p_business_id uuid,p_action text,p_data jsonb,p_request_id uuid) returns jsonb
  language sql security invoker set search_path='' as $$
  select tracker_private.write_record(p_business_id,p_action,p_data,p_request_id)
$$;

create function tracker_private.invite_allowed(b uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or tracker_private.member_role(b) is distinct from 'owner' then raise exception 'Owner access required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(b::text,2));
  delete from tracker_private.invite_attempts where business_id=b and attempted_at < now()-interval '15 minutes';
  if (select count(*) from tracker_private.invite_attempts where business_id=b)>=10 then return false; end if;
  insert into tracker_private.invite_attempts(business_id) values(b);
  return true;
end $$;
create function public.tracker_invite_allowed(p_business_id uuid) returns boolean language sql security invoker set search_path='' as $$
  select tracker_private.invite_allowed(p_business_id)
$$;

-- Administrative SQL only. The operator selects an existing verified user's
-- UUID. The fixed business ID makes the bootstrap repeatable without ever
-- assigning ownership of an existing tenant to a different account.
create function tracker_private.bootstrap_business(b uuid,owner_id uuid,business_name text default 'Sabarish Fast Food')
returns uuid language plpgsql security invoker set search_path='' as $$
begin
  if b is null or owner_id is null or not exists(select 1 from auth.users where id=owner_id
    and email_confirmed_at is not null and deleted_at is null) then
    raise exception 'Select an existing email-verified Auth account';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(b::text,3));
  if exists(select 1 from public.businesses where id=b) then
    if not exists(select 1 from public.business_memberships where business_id=b and user_id=owner_id and role='owner' and active)
      then raise exception 'This business already exists with another owner'; end if;
    return b;
  end if;
  perform set_config('tracker.action','bootstrap',true);
  insert into public.businesses(id,name) values(b,business_name);
  insert into public.business_memberships(business_id,user_id,role) values(b,owner_id,'owner');
  insert into public.expense_categories(business_id,name,color) values
    (b,'Chicken','#EF402B'),(b,'Today''s Shopping','#F59E0B'),(b,'Indian Stores','#6366F1'),(b,'Market','#16A34A'),(b,'Other Expenses','#64748B');
  return b;
end $$;

-- Supabase projects may configure broader default explicit grants in public.
revoke all on all functions in schema tracker_private from public,anon,authenticated;
revoke all on all tables in schema tracker_private from public,anon,authenticated;
revoke all on function public.tracker_write(uuid,text,jsonb,uuid),public.tracker_invite_allowed(uuid) from public,anon,authenticated;
grant execute on function tracker_private.member_role(uuid),tracker_private.profile_visible(uuid),
  tracker_private.write_record(uuid,text,jsonb,uuid),tracker_private.invite_allowed(uuid),
  public.tracker_write(uuid,text,jsonb,uuid),public.tracker_invite_allowed(uuid) to authenticated;
