-- =============================================================================
--  LABEASY — ROLE-BASED, LAB-FIRST ARCHITECTURE  (additive migration)
-- =============================================================================
--  Run AFTER the base script in database.html. Safe to re-run (idempotent).
--
--  Nothing here drops or rewrites an existing table. Everything is either a
--  new table, an `add column if not exists`, or an additional RLS policy that
--  sits alongside the ones already in place (policies are OR'ed, so existing
--  patient/admin access keeps working exactly as before).
--
--  Reused as-is (NOT duplicated):
--    booked_tests     -> the lab booking; already has booking_ref (BK01)
--    medical_reports  -> the report; already has report_ref (RP01)
--    payments         -> payment rows
--    user_profiles    -> account profile; already has role / status / email
--    diagnostic_tests -> test catalog (now optionally lab-scoped)
--    is_admin()       -> platform-admin RLS helper
--    storage 'reports' bucket
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM-LIKE VALUE SETS
-- -----------------------------------------------------------------------------
do $$ begin
  create type lab_status_enum as enum
    ('pending','approved','rejected','suspended','inactive');
exception when duplicate_object then null; end $$;

-- Workflow stages are kept as text + check constraint (cheaper to extend later
-- than an enum, and readable in the admin "Today" board).
--   booked -> payment_pending -> payment_completed -> sent_for_testing
--          -> testing_in_progress -> testing_completed -> report_pending
--          -> report_uploaded -> completed   (cancelled at any point)

-- -----------------------------------------------------------------------------
-- 2. LABS — the registering organisation
-- -----------------------------------------------------------------------------
create table if not exists public.labs (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text unique,
  owner_user_id     uuid references auth.users(id) on delete set null,
  contact_person    text default '',
  email             text not null,
  phone             text default '',
  alt_phone         text default '',
  license_no        text default '',
  registration_no   text default '',
  address           text default '',
  city              text default '',
  pincode           text default '',
  description       text default '',
  logo_url          text default '',
  status            lab_status_enum not null default 'pending',
  rejection_reason  text,
  approved_at       timestamptz,
  approved_by       uuid references auth.users(id) on delete set null,
  suspended_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_labs_status on public.labs(status);
create index if not exists idx_labs_owner  on public.labs(owner_user_id);
create unique index if not exists uq_labs_email on public.labs(lower(email));

-- Human-friendly ref (LB01, LB02 …) to match the BK/RP style already in use.
alter table public.labs add column if not exists lab_ref text;
create sequence if not exists public.ref_seq_labs;
do $$
declare r record;
begin
  for r in select id from public.labs where lab_ref is null order by created_at, id loop
    update public.labs
      set lab_ref = 'LB' || lpad(nextval('public.ref_seq_labs')::text, 2, '0')
      where id = r.id;
  end loop;
end $$;
alter table public.labs
  alter column lab_ref set default 'LB' || lpad(nextval('public.ref_seq_labs')::text, 2, '0');
create unique index if not exists labs_lab_ref_idx on public.labs(lab_ref);

-- -----------------------------------------------------------------------------
-- 3. USER_PROFILES — attach an account to a lab and widen the role set
-- -----------------------------------------------------------------------------
--  role already exists (text, default 'patient'). We only add lab_id and a
--  NOT VALID check so existing rows are never rejected.
alter table public.user_profiles add column if not exists lab_id uuid references public.labs(id) on delete set null;
alter table public.user_profiles add column if not exists last_login_at timestamptz;

do $$ begin
  alter table public.user_profiles
    add constraint user_profiles_role_check
    check (role in ('admin','lab_admin','receptionist','tester','reportist','patient','user'))
    not valid;
exception when duplicate_object then null; end $$;

create index if not exists idx_user_profiles_lab_id on public.user_profiles(lab_id);
create index if not exists idx_user_profiles_role   on public.user_profiles(role);
create index if not exists idx_user_profiles_email  on public.user_profiles(lower(email));

-- -----------------------------------------------------------------------------
-- 4. LAB STAFF INVITES — how a Lab Admin creates staff accounts
-- -----------------------------------------------------------------------------
--  The Lab Admin records the invite (email + role); the account itself is
--  created through normal Supabase signup. handle_new_user() below reads the
--  pending invite and stamps role + lab_id onto the new profile, so staff can
--  never self-assign a role or a lab.
create table if not exists public.lab_staff_invites (
  id               uuid primary key default gen_random_uuid(),
  lab_id           uuid not null references public.labs(id) on delete cascade,
  email            text not null,
  full_name        text default '',
  phone            text default '',
  role             text not null check (role in ('lab_admin','receptionist','tester','reportist')),
  status           text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_by       uuid references auth.users(id) on delete set null,
  accepted_user_id uuid references auth.users(id) on delete set null,
  accepted_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_lab_staff_invites_lab on public.lab_staff_invites(lab_id);
create unique index if not exists uq_lab_staff_invites_pending
  on public.lab_staff_invites (lower(email)) where status = 'pending';

-- -----------------------------------------------------------------------------
-- 5. SIGNUP TRIGGER — role/lab assignment at account creation
-- -----------------------------------------------------------------------------
--  Extends (does not replace the behaviour of) the original handle_new_user:
--  a profile row is still created for every new account with role 'patient'
--  by default. On top of that:
--    * a pending lab_staff_invite for the same email  -> that role + lab_id
--    * signup_role = 'lab_admin' in the signup metadata -> lab_admin (the lab
--      row itself is inserted by the registration form right after signup)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv          public.lab_staff_invites%rowtype;
  wanted_role  text;
  new_role     text := 'patient';
  new_lab_id   uuid := null;
begin
  select * into inv
  from public.lab_staff_invites
  where lower(email) = lower(new.email) and status = 'pending'
  order by created_at desc
  limit 1;

  if inv.id is not null then
    new_role   := inv.role;
    new_lab_id := inv.lab_id;
  else
    wanted_role := nullif(new.raw_user_meta_data ->> 'signup_role', '');
    -- Only the lab-owner role may be self-selected at signup; every other
    -- privileged role has to come from an invite created by a Lab Admin.
    if wanted_role = 'lab_admin' then
      new_role := 'lab_admin';
    end if;
  end if;

  insert into public.user_profiles (user_id, full_name, phone, email, role, lab_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    new_role,
    new_lab_id
  )
  on conflict (user_id) do update
    set email  = excluded.email,
        -- never demote a role that has already been assigned
        role   = case when user_profiles.role = 'patient'
                      then excluded.role else user_profiles.role end,
        lab_id = coalesce(user_profiles.lab_id, excluded.lab_id);

  if inv.id is not null then
    update public.lab_staff_invites
      set status = 'accepted', accepted_user_id = new.id, accepted_at = now(), updated_at = now()
      where id = inv.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 6. BOOKED_TESTS — lab scoping + the staff workflow
-- -----------------------------------------------------------------------------
--  booking_ref (BK01) already exists and stays the Booking ID.
alter table public.booked_tests add column if not exists lab_id               uuid references public.labs(id) on delete set null;
alter table public.booked_tests add column if not exists workflow_status      text not null default 'booked';
alter table public.booked_tests add column if not exists payment_status       text not null default 'pending';
alter table public.booked_tests add column if not exists payment_method       text default 'cash';
alter table public.booked_tests add column if not exists amount_paid          numeric not null default 0;
alter table public.booked_tests add column if not exists source               text not null default 'online';
alter table public.booked_tests add column if not exists patient_email        text default '';
alter table public.booked_tests add column if not exists created_by           uuid references auth.users(id) on delete set null;
alter table public.booked_tests add column if not exists assigned_tester      uuid references auth.users(id) on delete set null;
alter table public.booked_tests add column if not exists assigned_reportist   uuid references auth.users(id) on delete set null;
alter table public.booked_tests add column if not exists sent_to_testing_at   timestamptz;
alter table public.booked_tests add column if not exists testing_started_at   timestamptz;
alter table public.booked_tests add column if not exists testing_completed_at timestamptz;
alter table public.booked_tests add column if not exists report_uploaded_at   timestamptz;
alter table public.booked_tests add column if not exists completed_at         timestamptz;
alter table public.booked_tests add column if not exists cancelled_at         timestamptz;
alter table public.booked_tests add column if not exists staff_notes          text default '';

-- Walk-in patients booked at the counter have no auth account of their own.
alter table public.booked_tests alter column user_id drop not null;

do $$ begin
  alter table public.booked_tests add constraint booked_tests_workflow_status_check
    check (workflow_status in (
      'booked','payment_pending','payment_completed','sent_for_testing',
      'testing_in_progress','testing_completed','report_pending',
      'report_uploaded','completed','cancelled')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.booked_tests add constraint booked_tests_payment_status_check
    check (payment_status in ('pending','partial','paid','refunded','waived')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.booked_tests add constraint booked_tests_source_check
    check (source in ('online','walk_in','phone')) not valid;
exception when duplicate_object then null; end $$;

-- Indexes that carry the Today board and each staff member's task queue.
create index if not exists idx_booked_tests_lab_id        on public.booked_tests(lab_id);
create index if not exists idx_booked_tests_lab_date      on public.booked_tests(lab_id, scheduled_date);
create index if not exists idx_booked_tests_workflow      on public.booked_tests(workflow_status);
create index if not exists idx_booked_tests_today         on public.booked_tests(scheduled_date, workflow_status);
create index if not exists idx_booked_tests_assigned_test on public.booked_tests(assigned_tester);
create index if not exists idx_booked_tests_assigned_rep  on public.booked_tests(assigned_reportist);

-- -----------------------------------------------------------------------------
-- 7. MEDICAL_REPORTS — lab scoping + PDF metadata
-- -----------------------------------------------------------------------------
alter table public.medical_reports add column if not exists lab_id       uuid references public.labs(id) on delete set null;
alter table public.medical_reports add column if not exists uploaded_by  uuid references auth.users(id) on delete set null;
alter table public.medical_reports add column if not exists file_path    text default '';
alter table public.medical_reports add column if not exists file_name    text default '';
alter table public.medical_reports add column if not exists file_size    bigint;
alter table public.medical_reports add column if not exists mime_type    text default 'application/pdf';
alter table public.medical_reports add column if not exists completed_at timestamptz;
alter table public.medical_reports alter column user_id drop not null;
create index if not exists idx_medical_reports_lab_id on public.medical_reports(lab_id);

-- -----------------------------------------------------------------------------
-- 8. DIAGNOSTIC_TESTS — optional lab ownership
-- -----------------------------------------------------------------------------
--  lab_id null  = platform catalog test, visible to every lab (existing rows)
--  lab_id set   = a test the lab created for itself
alter table public.diagnostic_tests add column if not exists lab_id uuid references public.labs(id) on delete cascade;
create index if not exists idx_diagnostic_tests_lab_id on public.diagnostic_tests(lab_id);

-- -----------------------------------------------------------------------------
-- 9. BOOKING ACTIVITY LOG — who moved a booking to which stage
-- -----------------------------------------------------------------------------
create table if not exists public.booking_activity (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.booked_tests(id) on delete cascade,
  lab_id      uuid references public.labs(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  actor_role  text,
  action      text not null,
  from_status text,
  to_status   text,
  note        text default '',
  created_at  timestamptz not null default now()
);
create index if not exists idx_booking_activity_booking on public.booking_activity(booking_id);
create index if not exists idx_booking_activity_lab     on public.booking_activity(lab_id, created_at desc);

create or replace function public.log_booking_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.workflow_status is distinct from old.workflow_status then
    insert into public.booking_activity (booking_id, lab_id, actor_id, actor_role, action, from_status, to_status)
    values (new.id, new.lab_id, auth.uid(), public.current_app_role(), 'workflow', old.workflow_status, new.workflow_status);
  elsif tg_op = 'INSERT' then
    insert into public.booking_activity (booking_id, lab_id, actor_id, actor_role, action, to_status)
    values (new.id, new.lab_id, auth.uid(), public.current_app_role(), 'created', new.workflow_status);
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. RLS HELPERS — the single source of truth for "who am I"
-- -----------------------------------------------------------------------------
--  All security definer so they can read user_profiles without tripping that
--  table's own RLS (same pattern as the existing is_admin()).
create or replace function public.current_app_role()
returns text language sql security definer stable set search_path = public as $$
  select role from public.user_profiles where user_id = auth.uid();
$$;

create or replace function public.current_lab_id()
returns uuid language sql security definer stable set search_path = public as $$
  select lab_id from public.user_profiles where user_id = auth.uid();
$$;

create or replace function public.current_user_active()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select status = 'active' from public.user_profiles where user_id = auth.uid()), false);
$$;

-- True when the caller belongs to an approved lab (suspended/rejected labs
-- keep their data but their staff cannot operate).
create or replace function public.is_lab_operational()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.user_profiles p
    join public.labs l on l.id = p.lab_id
    where p.user_id = auth.uid()
      and p.status = 'active'
      and l.status = 'approved'
  );
$$;

-- Caller works at this lab (any lab role) and the lab is approved.
create or replace function public.has_lab_access(target_lab uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select target_lab is not null
     and target_lab = public.current_lab_id()
     and public.is_lab_operational();
$$;

create or replace function public.has_lab_role(target_lab uuid, variadic allowed text[])
returns boolean language sql security definer stable set search_path = public as $$
  select public.has_lab_access(target_lab) and public.current_app_role() = any(allowed);
$$;

-- -----------------------------------------------------------------------------
-- 11. WORKFLOW ENFORCEMENT — role-gated stage transitions, in the database
-- -----------------------------------------------------------------------------
--  The UI hides the buttons a role must not press; this makes it true even for
--  a hand-written API call.
create or replace function public.enforce_booking_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text := public.current_app_role();
begin
  -- Platform admin and the service role are unrestricted.
  if r = 'admin' or auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A lab account may only create bookings inside its own lab.
    if r in ('lab_admin','receptionist') then
      new.lab_id := coalesce(new.lab_id, public.current_lab_id());
      if new.lab_id is distinct from public.current_lab_id() then
        raise exception 'Bookings can only be created for your own lab';
      end if;
      new.created_by := coalesce(new.created_by, auth.uid());
    end if;
    return new;
  end if;

  -- Payment first: a booking may not enter the testing queue until it is paid.
  -- 'waived' is the documented escape hatch for a lab that bills separately.
  if new.workflow_status = 'sent_for_testing'
     and coalesce(new.payment_status, 'pending') not in ('paid', 'waived') then
    raise exception 'Take the payment before sending this booking for testing';
  end if;

  if new.workflow_status is distinct from old.workflow_status then
    if r = 'lab_admin' then
      null; -- the Lab Admin can move a booking to any stage
    elsif r = 'receptionist' then
      if new.workflow_status not in
         ('booked','payment_pending','payment_completed','sent_for_testing','cancelled') then
        raise exception 'A receptionist cannot move a booking to %', new.workflow_status;
      end if;
    elsif r = 'tester' then
      if new.workflow_status not in ('testing_in_progress','testing_completed') then
        raise exception 'A tester cannot move a booking to %', new.workflow_status;
      end if;
      if old.workflow_status not in ('sent_for_testing','testing_in_progress') then
        raise exception 'This booking has not reached the testing stage yet';
      end if;
    elsif r = 'reportist' then
      if new.workflow_status not in ('report_pending','report_uploaded','completed') then
        raise exception 'A reportist cannot move a booking to %', new.workflow_status;
      end if;
      if old.workflow_status not in ('testing_completed','report_pending','report_uploaded') then
        raise exception 'Testing is not finished for this booking yet';
      end if;
    else
      raise exception 'Your role cannot change the status of a booking';
    end if;
  end if;

  -- Stage timestamps, stamped centrally so every path agrees.
  if new.workflow_status is distinct from old.workflow_status then
    case new.workflow_status
      when 'sent_for_testing'    then new.sent_to_testing_at   := coalesce(new.sent_to_testing_at, now());
      when 'testing_in_progress' then new.testing_started_at   := coalesce(new.testing_started_at, now());
      when 'testing_completed'   then new.testing_completed_at := coalesce(new.testing_completed_at, now());
      when 'report_uploaded'     then new.report_uploaded_at   := coalesce(new.report_uploaded_at, now());
      when 'completed'           then new.completed_at         := coalesce(new.completed_at, now());
      when 'cancelled'           then new.cancelled_at         := coalesce(new.cancelled_at, now());
      else null;
    end case;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_booking_workflow on public.booked_tests;
create trigger trg_enforce_booking_workflow
  before insert or update on public.booked_tests
  for each row execute function public.enforce_booking_workflow();

drop trigger if exists trg_log_booking_workflow on public.booked_tests;
create trigger trg_log_booking_workflow
  after insert or update on public.booked_tests
  for each row execute function public.log_booking_workflow();

-- A lab may never approve itself: status and the approval fields are
-- admin-only, whoever writes the row.
create or replace function public.protect_lab_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.approved_at := null;
    new.approved_by := null;
    new.rejection_reason := null;
    new.owner_user_id := coalesce(new.owner_user_id, auth.uid());
  else
    new.status           := old.status;
    new.approved_at      := old.approved_at;
    new.approved_by      := old.approved_by;
    new.rejection_reason := old.rejection_reason;
    new.owner_user_id    := old.owner_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_lab_status on public.labs;
create trigger trg_protect_lab_status
  before insert or update on public.labs
  for each row execute function public.protect_lab_status();

-- Keep the owner's profile pointed at the lab they just registered.
create or replace function public.link_lab_owner_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_user_id is not null then
    update public.user_profiles
      set lab_id = new.id,
          role   = case when role in ('patient','user') then 'lab_admin' else role end,
          updated_at = now()
      where user_id = new.owner_user_id and lab_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_link_lab_owner_profile on public.labs;
create trigger trg_link_lab_owner_profile
  after insert on public.labs
  for each row execute function public.link_lab_owner_profile();

-- updated_at on the new tables (mirrors section 9.7 of the base script)
do $$
declare t text;
begin
  foreach t in array array['labs','lab_staff_invites'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY — data isolation between labs
-- -----------------------------------------------------------------------------
alter table public.labs               enable row level security;
alter table public.lab_staff_invites  enable row level security;
alter table public.booking_activity   enable row level security;

-- ---- labs -------------------------------------------------------------------
drop policy if exists "labs admin full access" on public.labs;
create policy "labs admin full access" on public.labs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "labs member read own" on public.labs;
create policy "labs member read own" on public.labs
  for select to authenticated
  using (id = public.current_lab_id() or owner_user_id = auth.uid());

-- Registration: any signed-in account may file exactly one lab of its own.
drop policy if exists "labs register own" on public.labs;
create policy "labs register own" on public.labs
  for insert to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists "labs lab_admin update own" on public.labs;
create policy "labs lab_admin update own" on public.labs
  for update to authenticated
  using (id = public.current_lab_id() and public.current_app_role() = 'lab_admin')
  with check (id = public.current_lab_id() and public.current_app_role() = 'lab_admin');

-- ---- lab_staff_invites ------------------------------------------------------
drop policy if exists "invites admin full access" on public.lab_staff_invites;
create policy "invites admin full access" on public.lab_staff_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "invites lab_admin manage own lab" on public.lab_staff_invites;
create policy "invites lab_admin manage own lab" on public.lab_staff_invites
  for all to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin'))
  with check (public.has_lab_role(lab_id, 'lab_admin'));

-- ---- user_profiles: a Lab Admin manages the staff of its own lab ------------
drop policy if exists "profiles lab_admin read own lab" on public.user_profiles;
create policy "profiles lab_admin read own lab" on public.user_profiles
  for select to authenticated
  using (lab_id is not null and lab_id = public.current_lab_id());

drop policy if exists "profiles lab_admin update own staff" on public.user_profiles;
create policy "profiles lab_admin update own staff" on public.user_profiles
  for update to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin') and role <> 'admin')
  with check (public.has_lab_role(lab_id, 'lab_admin') and role <> 'admin');

-- ---- booked_tests: lab-scoped access on top of the existing owner policies --
drop policy if exists "bookings lab read own lab" on public.booked_tests;
create policy "bookings lab read own lab" on public.booked_tests
  for select to authenticated
  using (public.has_lab_access(lab_id));

drop policy if exists "bookings lab create" on public.booked_tests;
create policy "bookings lab create" on public.booked_tests
  for insert to authenticated
  with check (public.has_lab_role(lab_id, 'lab_admin', 'receptionist'));

drop policy if exists "bookings lab update" on public.booked_tests;
create policy "bookings lab update" on public.booked_tests
  for update to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin', 'receptionist', 'tester', 'reportist'))
  with check (public.has_lab_role(lab_id, 'lab_admin', 'receptionist', 'tester', 'reportist'));

drop policy if exists "bookings lab_admin delete" on public.booked_tests;
create policy "bookings lab_admin delete" on public.booked_tests
  for delete to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin'));

-- ---- medical_reports --------------------------------------------------------
drop policy if exists "reports lab read own lab" on public.medical_reports;
create policy "reports lab read own lab" on public.medical_reports
  for select to authenticated
  using (public.has_lab_access(lab_id));

drop policy if exists "reports lab upload" on public.medical_reports;
create policy "reports lab upload" on public.medical_reports
  for insert to authenticated
  with check (public.has_lab_role(lab_id, 'lab_admin', 'reportist'));

drop policy if exists "reports lab update" on public.medical_reports;
create policy "reports lab update" on public.medical_reports
  for update to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin', 'reportist'))
  with check (public.has_lab_role(lab_id, 'lab_admin', 'reportist'));

-- ---- diagnostic_tests: labs curate their own tests --------------------------
--  (the existing "Public read" policy on this table is left untouched)
drop policy if exists "tests lab manage own" on public.diagnostic_tests;
create policy "tests lab manage own" on public.diagnostic_tests
  for all to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin'))
  with check (public.has_lab_role(lab_id, 'lab_admin'));

-- ---- booking_activity -------------------------------------------------------
drop policy if exists "activity admin read" on public.booking_activity;
create policy "activity admin read" on public.booking_activity
  for select to authenticated using (public.is_admin());

drop policy if exists "activity lab read own lab" on public.booking_activity;
create policy "activity lab read own lab" on public.booking_activity
  for select to authenticated using (public.has_lab_access(lab_id));

-- -----------------------------------------------------------------------------
-- 13. STORAGE — report PDFs live under  reports/lab/<lab_id>/<booking_ref>.pdf
-- -----------------------------------------------------------------------------
--  The existing admin + patient-owner policies stay; these add lab staff.
drop policy if exists "reports lab staff insert" on storage.objects;
create policy "reports lab staff insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = 'lab'
    and (storage.foldername(name))[2] = public.current_lab_id()::text
    and public.current_app_role() in ('lab_admin','reportist')
  );

drop policy if exists "reports lab staff update" on storage.objects;
create policy "reports lab staff update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = 'lab'
    and (storage.foldername(name))[2] = public.current_lab_id()::text
    and public.current_app_role() in ('lab_admin','reportist')
  );

drop policy if exists "reports lab staff read" on storage.objects;
create policy "reports lab staff read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or ((storage.foldername(name))[1] = 'lab'
          and (storage.foldername(name))[2] = public.current_lab_id()::text)
    )
  );

drop policy if exists "reports lab staff delete" on storage.objects;
create policy "reports lab staff delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = 'lab'
    and (storage.foldername(name))[2] = public.current_lab_id()::text
    and public.current_app_role() = 'lab_admin'
  );

-- -----------------------------------------------------------------------------
-- 14. PLATFORM SETTINGS
-- -----------------------------------------------------------------------------
--  public_portal_enabled = false  ->  no patient dashboard / public booking.
--  The admin can flip it to true later without any code change.
insert into public.settings (key, value) values
  ('public_portal_enabled', 'false'::jsonb),
  ('lab_registration_open', 'true'::jsonb)
on conflict (key) do nothing;

-- Platform rename. Skip these two lines if you want to keep your current
-- brand name in Admin > Settings.
insert into public.settings (key, value) values
  ('brand_name',    '"Lab Easy"'::jsonb),
  ('brand_tagline', '"Diagnostics, organised."'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();


-- =============================================================================
-- 17. SUPPORT TICKETS — labs and prospects writing to the platform admin
-- =============================================================================
--  Reuses `contact_messages`, which already carries status, priority,
--  admin_reply and the TK01 reference the admin Support screen reads. All we
--  add is who sent it, so a lab can see its own thread and the admin can tell
--  a registered lab from a pre-registration enquiry.
-- =============================================================================

alter table public.contact_messages add column if not exists lab_id   uuid references public.labs(id) on delete set null;
alter table public.contact_messages add column if not exists user_id  uuid references auth.users(id) on delete set null;
alter table public.contact_messages add column if not exists category text not null default 'general';
alter table public.contact_messages add column if not exists source   text not null default 'website';

create index if not exists idx_contact_messages_lab_id  on public.contact_messages(lab_id);
create index if not exists idx_contact_messages_user_id on public.contact_messages(user_id);

do $$ begin
  alter table public.contact_messages add constraint contact_messages_source_check
    check (source in ('website', 'lab_dashboard')) not valid;
exception when duplicate_object then null; end $$;

-- The insert policy from the base script ("Anyone can submit") already lets an
-- anonymous visitor file an enquiry, which is what the public form needs.
-- These add the reading side: a lab sees its own tickets and the admin's reply,
-- and nobody else's. Admins keep full access through "admin full access".
drop policy if exists "tickets sender can read own" on public.contact_messages;
create policy "tickets sender can read own" on public.contact_messages
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "tickets lab read own lab" on public.contact_messages;
create policy "tickets lab read own lab" on public.contact_messages
  for select to authenticated
  using (lab_id is not null and lab_id = public.current_lab_id());


-- =============================================================================
-- 18. REPORT STATUS BELONGS TO THE LABORATORY
-- =============================================================================
--  The platform admin monitors reports across every lab but does not verify,
--  flag or close them — the lab that ran the test owns that call. The admin
--  screens no longer offer those buttons; this makes it true for any caller.
--
--  Everything else about a report stays open to the admin (reading it,
--  deleting a bad row, fixing metadata) — only the status fields are fenced.
-- =============================================================================
create or replace function public.protect_report_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The service role and SQL-editor sessions are unrestricted.
  if auth.uid() is null then
    return new;
  end if;

  if public.current_app_role() = 'admin'
     and (new.status is distinct from old.status
          or new.is_verified is distinct from old.is_verified
          or new.completed_at is distinct from old.completed_at) then
    raise exception
      'Report status is set by the laboratory that ran the test, not by the platform admin';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_report_status on public.medical_reports;
create trigger trg_protect_report_status
  before update on public.medical_reports
  for each row execute function public.protect_report_status();


-- =============================================================================
-- 19. LAB DOCUMENTS — the paperwork an admin verifies a laboratory against
-- =============================================================================
--  A registering lab attaches its licence and certificates as PDFs; the
--  platform admin reads them before approving. Files live in a private bucket
--  under  lab-docs/<lab_id>/…  and the row below is the index the screens read.
--
--  Note the deliberate difference from every other lab-scoped policy: these
--  must work for a lab that is still `pending`, which is exactly when the
--  paperwork matters. can_manage_lab_docs() therefore checks ownership and
--  membership but NOT approval.
-- =============================================================================

create table if not exists public.lab_documents (
  id          uuid primary key default gen_random_uuid(),
  lab_id      uuid not null references public.labs(id) on delete cascade,
  doc_type    text not null default 'other',
  title       text default '',
  file_path   text not null,
  file_name   text default '',
  file_size   bigint,
  mime_type   text default 'application/pdf',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_lab_documents_lab_id on public.lab_documents(lab_id);

do $$ begin
  alter table public.lab_documents add constraint lab_documents_doc_type_check
    check (doc_type in ('license','registration','accreditation','id_proof','address_proof','other'))
    not valid;
exception when duplicate_object then null; end $$;

drop trigger if exists set_updated_at on public.lab_documents;
create trigger set_updated_at before update on public.lab_documents
  for each row execute function public.set_updated_at();

-- Can the caller manage this lab's paperwork? True for the owner who filed the
-- registration and for a lab_admin of that lab, approved or not.
create or replace function public.can_manage_lab_docs(target_lab uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select target_lab is not null and exists (
    select 1 from public.labs l
    where l.id = target_lab
      and (l.owner_user_id = auth.uid() or l.id = public.current_lab_id())
  );
$$;

alter table public.lab_documents enable row level security;

drop policy if exists "lab docs admin full access" on public.lab_documents;
create policy "lab docs admin full access" on public.lab_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lab docs own lab read" on public.lab_documents;
create policy "lab docs own lab read" on public.lab_documents
  for select to authenticated using (public.can_manage_lab_docs(lab_id));

drop policy if exists "lab docs own lab write" on public.lab_documents;
create policy "lab docs own lab write" on public.lab_documents
  for insert to authenticated with check (public.can_manage_lab_docs(lab_id));

drop policy if exists "lab docs own lab delete" on public.lab_documents;
create policy "lab docs own lab delete" on public.lab_documents
  for delete to authenticated using (public.can_manage_lab_docs(lab_id));

-- ---- storage: a private bucket for the paperwork --------------------------
insert into storage.buckets (id, name, public)
values ('lab-docs', 'lab-docs', false)
on conflict (id) do nothing;

drop policy if exists "lab docs upload" on storage.objects;
create policy "lab docs upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lab-docs'
    and public.can_manage_lab_docs(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "lab docs read" on storage.objects;
create policy "lab docs read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lab-docs'
    and (public.is_admin() or public.can_manage_lab_docs(((storage.foldername(name))[1])::uuid))
  );

drop policy if exists "lab docs delete" on storage.objects;
create policy "lab docs delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lab-docs'
    and (public.is_admin() or public.can_manage_lab_docs(((storage.foldername(name))[1])::uuid))
  );

-- A note on the labs table itself: verification state already lives in
-- `status` + `approved_at` + `approved_by`, so nothing new is needed there.


-- =============================================================================
-- 20. LAB TEST CATALOGUE, PARAMETERS AND STRUCTURED REPORTS
-- =============================================================================
--  A laboratory decides which tests it offers, what each one costs, and what
--  the report for it contains. One test holds many parameters — CBC is one
--  bookable test made of Haemoglobin, RBC, WBC, Platelets and so on — and the
--  values a tester types against those parameters are the report.
--
--  Reuses `diagnostic_tests` (already lab-scoped by section 8) as the test
--  itself, so the booking picker, prices and `items` on a booking all keep
--  working unchanged. Two new tables carry what it could not express:
--
--    test_parameters  the analytes inside a test, with units and ranges
--    report_values    what was measured, per booking, per parameter
-- =============================================================================

-- ---- 20.1 the analytes inside a test --------------------------------------
create table if not exists public.test_parameters (
  id           uuid primary key default gen_random_uuid(),
  test_id      uuid not null references public.diagnostic_tests(id) on delete cascade,
  -- Denormalised from the test so a policy can check it without a join.
  lab_id       uuid references public.labs(id) on delete cascade,
  name         text not null,
  unit         text default '',
  -- Always shown on the report as written; the numeric pair below is optional
  -- and only drives automatic high/low flagging.
  ref_range    text default '',
  ref_low      numeric,
  ref_high     numeric,
  sex          text not null default 'any',
  group_label  text default '',
  method       text default '',
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_test_parameters_test_id on public.test_parameters(test_id, sort_order);
create index if not exists idx_test_parameters_lab_id  on public.test_parameters(lab_id);

do $$ begin
  alter table public.test_parameters add constraint test_parameters_sex_check
    check (sex in ('any', 'male', 'female')) not valid;
exception when duplicate_object then null; end $$;

drop trigger if exists set_updated_at on public.test_parameters;
create trigger set_updated_at before update on public.test_parameters
  for each row execute function public.set_updated_at();

-- Keep lab_id in step with the test it belongs to, whoever writes the row.
create or replace function public.sync_parameter_lab()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select lab_id into new.lab_id from public.diagnostic_tests where id = new.test_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_parameter_lab on public.test_parameters;
create trigger trg_sync_parameter_lab
  before insert or update of test_id on public.test_parameters
  for each row execute function public.sync_parameter_lab();

-- ---- 20.2 the measured values ---------------------------------------------
create table if not exists public.report_values (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid not null references public.booked_tests(id) on delete cascade,
  lab_id         uuid not null references public.labs(id) on delete cascade,
  report_id      uuid references public.medical_reports(id) on delete set null,
  test_id        uuid references public.diagnostic_tests(id) on delete set null,
  test_name      text default '',
  parameter_id   uuid references public.test_parameters(id) on delete set null,
  -- Names, units and ranges are snapshotted: editing the catalogue next year
  -- must not rewrite a report issued today.
  parameter_name text not null,
  unit           text default '',
  ref_range      text default '',
  value          text default '',
  flag           text not null default 'normal',
  group_label    text default '',
  sort_order     int not null default 0,
  entered_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_report_values_booking on public.report_values(booking_id, sort_order);
create index if not exists idx_report_values_lab     on public.report_values(lab_id);

do $$ begin
  alter table public.report_values add constraint report_values_flag_check
    check (flag in ('low', 'normal', 'high', 'abnormal', '')) not valid;
exception when duplicate_object then null; end $$;

drop trigger if exists set_updated_at on public.report_values;
create trigger set_updated_at before update on public.report_values
  for each row execute function public.set_updated_at();

-- ---- 20.3 who may do what --------------------------------------------------
alter table public.test_parameters enable row level security;
alter table public.report_values   enable row level security;

-- Parameters of a shared (admin) test are readable by everyone signed in;
-- a lab's own parameters only by that lab.
drop policy if exists "parameters admin full access" on public.test_parameters;
create policy "parameters admin full access" on public.test_parameters
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "parameters readable" on public.test_parameters;
create policy "parameters readable" on public.test_parameters
  for select to authenticated
  using (lab_id is null or lab_id = public.current_lab_id());

-- Only the Lab Admin curates the lab's own catalogue.
drop policy if exists "parameters lab_admin manage" on public.test_parameters;
create policy "parameters lab_admin manage" on public.test_parameters
  for all to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin'))
  with check (public.has_lab_role(lab_id, 'lab_admin'));

-- Results: everyone at the lab can read them; the bench and the report desk
-- write them. The platform admin can read across labs but never write —
-- consistent with report status being the laboratory's call.
drop policy if exists "results admin read" on public.report_values;
create policy "results admin read" on public.report_values
  for select to authenticated using (public.is_admin());

drop policy if exists "results lab read" on public.report_values;
create policy "results lab read" on public.report_values
  for select to authenticated using (public.has_lab_access(lab_id));

drop policy if exists "results lab write" on public.report_values;
create policy "results lab write" on public.report_values
  for insert to authenticated
  with check (public.has_lab_role(lab_id, 'lab_admin', 'tester', 'reportist'));

drop policy if exists "results lab update" on public.report_values;
create policy "results lab update" on public.report_values
  for update to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin', 'tester', 'reportist'))
  with check (public.has_lab_role(lab_id, 'lab_admin', 'tester', 'reportist'));

drop policy if exists "results lab delete" on public.report_values;
create policy "results lab delete" on public.report_values
  for delete to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin', 'tester', 'reportist'));

-- A tester who finishes a run now creates the report record itself, so the
-- insert policy from section 12 has to admit that role too.
drop policy if exists "reports lab upload" on public.medical_reports;
create policy "reports lab upload" on public.medical_reports
  for insert to authenticated
  with check (public.has_lab_role(lab_id, 'lab_admin', 'reportist', 'tester'));

drop policy if exists "reports lab update" on public.medical_reports;
create policy "reports lab update" on public.medical_reports
  for update to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin', 'reportist', 'tester'))
  with check (public.has_lab_role(lab_id, 'lab_admin', 'reportist', 'tester'));

-- ---- 20.4 the lab's own tests ---------------------------------------------
--  diagnostic_tests already carries lab_id (section 8) and the Lab Admin
--  write policy (section 12). These columns simply make a lab-created row
--  self-sufficient — the shared catalogue rows already have them.
alter table public.diagnostic_tests add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.diagnostic_tests alter column slug drop not null;

-- Two labs may legitimately both offer "CBC", so a global unique slug would
-- block the second one. Scope uniqueness to the lab instead.
do $$ begin
  alter table public.diagnostic_tests drop constraint if exists diagnostic_tests_slug_key;
exception when undefined_object then null; end $$;
drop index if exists public.diagnostic_tests_slug_key;
create unique index if not exists uq_diagnostic_tests_slug_per_lab
  on public.diagnostic_tests (coalesce(lab_id::text, 'global'), slug)
  where slug is not null;

-- Short codes collide for the same reason names do: "CBC" is "CBC" at every
-- laboratory. Scope that uniqueness per lab too, or the second lab to type it
-- gets a duplicate-key error it can do nothing about.
do $$ begin
  alter table public.diagnostic_tests drop constraint if exists diagnostic_tests_test_code_key;
exception when undefined_object then null; end $$;
drop index if exists public.diagnostic_tests_test_code_key;
create unique index if not exists uq_diagnostic_tests_code_per_lab
  on public.diagnostic_tests (coalesce(lab_id::text, 'global'), test_code)
  where test_code is not null;



-- =============================================================================
-- 21. PLATFORM TEST CATALOGUE — real tests with their sub-tests
-- =============================================================================
--  The shared catalogue the platform admin maintains and a laboratory copies
--  from (Lab → Tests → Add from library). Every test here carries its analytes
--  with units and adult reference ranges, so a copied test produces a complete
--  report on day one.
--
--  Idempotent and non-destructive by design:
--    * a test is inserted only if no platform test of that name exists
--    * an existing test's PRICE IS NEVER OVERWRITTEN — the admin's edits win
--    * parameters are seeded only when a test has none, so edited sub-tests
--      survive a re-run of this script
--
--  Prices are placeholders in the site's configured currency. Edit them in
--  Admin → Manage Tests; a lab sets its own price when it copies the test.
-- =============================================================================

do $$
declare
  t   record;
  p   jsonb;
  tid uuid;
  i   int;
  slug_base text;
  code_use  text;
begin
  for t in
    select * from (values
      (
        'CBC (Complete Blood Count)', 'CBC', 'Haematology', 'Whole blood (EDTA)', 400, 24, false,
        '[
          {"n":"Haemoglobin (Hb)","u":"g/dL","r":"12.0 – 15.5","lo":12,"hi":15.5,"g":""},
          {"n":"RBC Count","u":"x10^6/µL","r":"3.80 – 4.80","lo":3.8,"hi":4.8,"g":""},
          {"n":"WBC Count","u":"/µL","r":"4,000 – 11,000","lo":4000,"hi":11000,"g":""},
          {"n":"Platelet Count","u":"x10^5/µL","r":"1.50 – 4.10","lo":1.5,"hi":4.1,"g":""},
          {"n":"Haematocrit (PCV)","u":"%","r":"36.0 – 46.0","lo":36,"hi":46,"g":""},
          {"n":"MCV","u":"fL","r":"80.0 – 100.0","lo":80,"hi":100,"g":"Red cell indices"},
          {"n":"MCH","u":"pg","r":"27.0 – 32.0","lo":27,"hi":32,"g":"Red cell indices"},
          {"n":"MCHC","u":"g/dL","r":"31.5 – 34.5","lo":31.5,"hi":34.5,"g":"Red cell indices"},
          {"n":"RDW","u":"%","r":"11.5 – 15.0","lo":11.5,"hi":15,"g":"Red cell indices"},
          {"n":"Neutrophils","u":"%","r":"40 – 75","lo":40,"hi":75,"g":"Differential count"},
          {"n":"Lymphocytes","u":"%","r":"20 – 45","lo":20,"hi":45,"g":"Differential count"},
          {"n":"Monocytes","u":"%","r":"2 – 10","lo":2,"hi":10,"g":"Differential count"},
          {"n":"Eosinophils","u":"%","r":"1 – 6","lo":1,"hi":6,"g":"Differential count"},
          {"n":"Basophils","u":"%","r":"0 – 2","lo":0,"hi":2,"g":"Differential count"}
        ]'::jsonb
      ),
      (
        'Lipid Profile', 'LIPID', 'Biochemistry', 'Serum', 700, 24, true,
        '[
          {"n":"Total Cholesterol","u":"mg/dL","r":"< 200","lo":null,"hi":200,"g":""},
          {"n":"Triglycerides","u":"mg/dL","r":"< 150","lo":null,"hi":150,"g":""},
          {"n":"HDL Cholesterol","u":"mg/dL","r":"40 – 60","lo":40,"hi":60,"g":""},
          {"n":"LDL Cholesterol","u":"mg/dL","r":"< 100","lo":null,"hi":100,"g":""},
          {"n":"VLDL Cholesterol","u":"mg/dL","r":"5 – 40","lo":5,"hi":40,"g":""},
          {"n":"Total Cholesterol / HDL Ratio","u":"ratio","r":"< 4.5","lo":null,"hi":4.5,"g":"Derived"}
        ]'::jsonb
      ),
      (
        'Liver Function Test (LFT)', 'LFT', 'Biochemistry', 'Serum', 800, 24, false,
        '[
          {"n":"Total Bilirubin","u":"mg/dL","r":"0.3 – 1.2","lo":0.3,"hi":1.2,"g":"Bilirubin"},
          {"n":"Direct Bilirubin","u":"mg/dL","r":"0.0 – 0.3","lo":0,"hi":0.3,"g":"Bilirubin"},
          {"n":"Indirect Bilirubin","u":"mg/dL","r":"0.1 – 1.0","lo":0.1,"hi":1.0,"g":"Bilirubin"},
          {"n":"SGPT (ALT)","u":"U/L","r":"7 – 56","lo":7,"hi":56,"g":"Enzymes"},
          {"n":"SGOT (AST)","u":"U/L","r":"5 – 40","lo":5,"hi":40,"g":"Enzymes"},
          {"n":"Alkaline Phosphatase","u":"U/L","r":"44 – 147","lo":44,"hi":147,"g":"Enzymes"},
          {"n":"Total Protein","u":"g/dL","r":"6.0 – 8.3","lo":6,"hi":8.3,"g":"Proteins"},
          {"n":"Albumin","u":"g/dL","r":"3.5 – 5.5","lo":3.5,"hi":5.5,"g":"Proteins"},
          {"n":"Globulin","u":"g/dL","r":"2.0 – 3.5","lo":2,"hi":3.5,"g":"Proteins"},
          {"n":"A/G Ratio","u":"ratio","r":"1.0 – 2.1","lo":1,"hi":2.1,"g":"Proteins"}
        ]'::jsonb
      ),
      (
        'Kidney Function Test (KFT)', 'KFT', 'Biochemistry', 'Serum', 800, 24, false,
        '[
          {"n":"Blood Urea","u":"mg/dL","r":"17 – 43","lo":17,"hi":43,"g":""},
          {"n":"Blood Urea Nitrogen (BUN)","u":"mg/dL","r":"8 – 20","lo":8,"hi":20,"g":""},
          {"n":"Serum Creatinine","u":"mg/dL","r":"0.6 – 1.1","lo":0.6,"hi":1.1,"g":""},
          {"n":"Uric Acid","u":"mg/dL","r":"2.6 – 6.0","lo":2.6,"hi":6,"g":""},
          {"n":"Sodium","u":"mmol/L","r":"136 – 145","lo":136,"hi":145,"g":"Electrolytes"},
          {"n":"Potassium","u":"mmol/L","r":"3.5 – 5.1","lo":3.5,"hi":5.1,"g":"Electrolytes"},
          {"n":"Chloride","u":"mmol/L","r":"98 – 107","lo":98,"hi":107,"g":"Electrolytes"}
        ]'::jsonb
      ),
      (
        'Thyroid Profile (T3, T4, TSH)', 'THY', 'Hormones', 'Serum', 600, 24, false,
        '[
          {"n":"T3 (Triiodothyronine)","u":"ng/dL","r":"80 – 200","lo":80,"hi":200,"g":""},
          {"n":"T4 (Thyroxine)","u":"µg/dL","r":"5.1 – 14.1","lo":5.1,"hi":14.1,"g":""},
          {"n":"TSH (Ultrasensitive)","u":"µIU/mL","r":"0.27 – 4.20","lo":0.27,"hi":4.2,"g":""}
        ]'::jsonb
      ),
      (
        'Blood Sugar (Fasting & PP)', 'BSFP', 'Biochemistry', 'Fluoride plasma', 250, 6, true,
        '[
          {"n":"Fasting Blood Sugar","u":"mg/dL","r":"70 – 100","lo":70,"hi":100,"g":""},
          {"n":"Post Prandial Blood Sugar","u":"mg/dL","r":"< 140","lo":null,"hi":140,"g":""}
        ]'::jsonb
      ),
      (
        'HbA1c (Glycated Haemoglobin)', 'HBA1C', 'Biochemistry', 'Whole blood (EDTA)', 550, 24, false,
        '[
          {"n":"HbA1c","u":"%","r":"4.0 – 5.6","lo":4,"hi":5.6,"g":""},
          {"n":"Estimated Average Glucose","u":"mg/dL","r":"68 – 114","lo":68,"hi":114,"g":"Derived"}
        ]'::jsonb
      ),
      (
        'Urine Routine & Microscopy', 'URINE', 'Clinical Pathology', 'Random urine', 200, 6, false,
        '[
          {"n":"Colour","u":"","r":"Pale yellow","lo":null,"hi":null,"g":"Physical"},
          {"n":"Appearance","u":"","r":"Clear","lo":null,"hi":null,"g":"Physical"},
          {"n":"Specific Gravity","u":"","r":"1.005 – 1.030","lo":1.005,"hi":1.030,"g":"Physical"},
          {"n":"pH","u":"pH","r":"4.6 – 8.0","lo":4.6,"hi":8,"g":"Physical"},
          {"n":"Protein","u":"","r":"Negative","lo":null,"hi":null,"g":"Chemical"},
          {"n":"Glucose","u":"","r":"Negative","lo":null,"hi":null,"g":"Chemical"},
          {"n":"Ketones","u":"","r":"Negative","lo":null,"hi":null,"g":"Chemical"},
          {"n":"Bilirubin","u":"","r":"Negative","lo":null,"hi":null,"g":"Chemical"},
          {"n":"Pus Cells","u":"/HPF","r":"0 – 5","lo":0,"hi":5,"g":"Microscopy"},
          {"n":"Epithelial Cells","u":"/HPF","r":"0 – 5","lo":0,"hi":5,"g":"Microscopy"},
          {"n":"RBCs","u":"/HPF","r":"0 – 2","lo":0,"hi":2,"g":"Microscopy"},
          {"n":"Casts","u":"/LPF","r":"Absent","lo":null,"hi":null,"g":"Microscopy"},
          {"n":"Crystals","u":"","r":"Absent","lo":null,"hi":null,"g":"Microscopy"}
        ]'::jsonb
      ),
      (
        'Vitamin Profile (D & B12)', 'VITDB12', 'Vitamins & Minerals', 'Serum', 1600, 48, false,
        '[
          {"n":"Vitamin D (25-OH)","u":"ng/mL","r":"30 – 100","lo":30,"hi":100,"g":""},
          {"n":"Vitamin B12","u":"pg/mL","r":"211 – 911","lo":211,"hi":911,"g":""}
        ]'::jsonb
      ),
      (
        'Iron Studies', 'IRON', 'Biochemistry', 'Serum', 900, 24, true,
        '[
          {"n":"Serum Iron","u":"µg/dL","r":"60 – 170","lo":60,"hi":170,"g":""},
          {"n":"TIBC","u":"µg/dL","r":"240 – 450","lo":240,"hi":450,"g":""},
          {"n":"Transferrin Saturation","u":"%","r":"20 – 50","lo":20,"hi":50,"g":"Derived"},
          {"n":"Ferritin","u":"ng/mL","r":"12 – 300","lo":12,"hi":300,"g":""}
        ]'::jsonb
      ),
      (
        'ESR & CRP', 'ESRCRP', 'Haematology', 'Whole blood (EDTA) / Serum', 350, 12, false,
        '[
          {"n":"ESR (Westergren)","u":"mm/hr","r":"0 – 20","lo":0,"hi":20,"g":""},
          {"n":"C-Reactive Protein (CRP)","u":"mg/L","r":"< 6","lo":null,"hi":6,"g":""}
        ]'::jsonb
      ),
      (
        'Dengue Profile (NS1, IgG, IgM)', 'DENGUE', 'Serology', 'Serum', 1200, 12, false,
        '[
          {"n":"Dengue NS1 Antigen","u":"","r":"Negative","lo":null,"hi":null,"g":""},
          {"n":"Dengue IgG Antibody","u":"","r":"Negative","lo":null,"hi":null,"g":""},
          {"n":"Dengue IgM Antibody","u":"","r":"Negative","lo":null,"hi":null,"g":""}
        ]'::jsonb
      ),
      (
        'Coagulation Profile (PT / INR)', 'PTINR', 'Coagulation', 'Citrated plasma', 500, 12, false,
        '[
          {"n":"Prothrombin Time (PT)","u":"seconds","r":"11 – 13.5","lo":11,"hi":13.5,"g":""},
          {"n":"INR","u":"ratio","r":"0.8 – 1.2","lo":0.8,"hi":1.2,"g":""},
          {"n":"APTT","u":"seconds","r":"25 – 35","lo":25,"hi":35,"g":""}
        ]'::jsonb
      ),
      (
        'Cardiac Markers (Troponin I)', 'TROPI', 'Cardiac Markers', 'Serum', 1400, 6, false,
        '[
          {"n":"Troponin I","u":"ng/mL","r":"< 0.04","lo":null,"hi":0.04,"g":""},
          {"n":"CK-MB","u":"U/L","r":"< 25","lo":null,"hi":25,"g":""}
        ]'::jsonb
      )
    ) as t(name, code, category, sample, price, hours, fasting, params)
  loop
    slug_base := trim(both '-' from regexp_replace(lower(t.name), '[^a-z0-9]+', '-', 'g'));

    -- The base catalogue may already carry this test under any of its three
    -- identities. Reuse whichever row matches rather than inserting a duplicate.
    select id into tid
    from public.diagnostic_tests
    where lab_id is null
      and (lower(name) = lower(t.name)
           or slug = slug_base
           or (t.code is not null and test_code = t.code))
    limit 1;

    if tid is null then
      -- Slug and short code are unique; step around anything already taken
      -- (including rows owned by a laboratory) instead of failing the script.
      if exists (select 1 from public.diagnostic_tests where slug = slug_base) then
        slug_base := slug_base || '-std';
      end if;

      code_use := t.code;
      if code_use is not null
         and exists (select 1 from public.diagnostic_tests where test_code = code_use) then
        code_use := null;
      end if;

      insert into public.diagnostic_tests
        (name, slug, test_code, category, price, mrp, sample_type,
         fasting_required, report_hours, is_active, description, lab_id)
      values
        (t.name, slug_base, code_use, t.category, t.price, t.price, t.sample,
         t.fasting, t.hours, true,
         'Platform catalogue test. Laboratories copy this and set their own price.', null)
      returning id into tid;
    end if;

    -- Seed the analytes only when the test has none: an admin who has edited
    -- these must not have that work undone by re-running the script.
    if not exists (select 1 from public.test_parameters where test_id = tid) then
      i := 0;
      for p in select * from jsonb_array_elements(t.params)
      loop
        insert into public.test_parameters
          (test_id, name, unit, ref_range, ref_low, ref_high, group_label, sort_order, is_active)
        values
          (tid,
           p ->> 'n',
           coalesce(p ->> 'u', ''),
           coalesce(p ->> 'r', ''),
           nullif(p ->> 'lo', '')::numeric,
           nullif(p ->> 'hi', '')::numeric,
           coalesce(p ->> 'g', ''),
           i,
           true);
        i := i + 1;
      end loop;
    end if;
  end loop;
end $$;

-- Verify what landed:
--   select t.name, t.category, t.price, count(p.id) as sub_tests
--   from public.diagnostic_tests t
--   left join public.test_parameters p on p.test_id = t.id
--   where t.lab_id is null
--   group by t.id, t.name, t.category, t.price
--   order by t.name;

-- =============================================================================
-- 15. DEMO ACCOUNTS  (optional — delete this section for a clean production DB)
-- =============================================================================
--  Creates the logins shown on the sign-in page, already e-mail-confirmed so
--  they work even with "Confirm email" switched on. Re-running resets the
--  passwords back to the values below.
--
--    admin@adminlabeasy.com  / admin@labeasy   ADMIN        -> /admin
--    user@userlabeasy.com    / user@labeasy    LAB_ADMIN    -> /lab
--    reception@userlabeasy.com / user@labeasy  RECEPTIONIST -> /lab
--    tester@userlabeasy.com    / user@labeasy  TESTER       -> /lab
--    reportist@userlabeasy.com / user@labeasy  REPORTIST    -> /lab
-- =============================================================================
create extension if not exists pgcrypto;

do $$
declare
  demo_lab_id uuid;
  acct        record;
  uid         uuid;
begin
  -- ---- the demo laboratory (already approved) ------------------------------
  select id into demo_lab_id from public.labs where lower(email) = 'user@userlabeasy.com';
  if demo_lab_id is null then
    insert into public.labs (name, slug, email, phone, contact_person, license_no,
                             address, city, description, status, approved_at)
    values ('LabEasy Demo Diagnostics', 'labeasy-demo-diagnostics', 'user@userlabeasy.com',
            '+880 1700-000000', 'Demo Lab Admin', 'LIC-DEMO-0001',
            'Level 3, Diagnostic Plaza, Gulshan Avenue', 'Dhaka',
            'Seeded laboratory used by the demo logins.', 'approved', now())
    returning id into demo_lab_id;
  else
    update public.labs set status = 'approved', approved_at = coalesce(approved_at, now())
      where id = demo_lab_id;
  end if;

  -- ---- the accounts ---------------------------------------------------------
  for acct in
    select * from (values
      ('admin@adminlabeasy.com',    'admin@labeasy', 'LabEasy Admin',      '+880 1700-000001', 'admin',        false),
      ('user@userlabeasy.com',      'user@labeasy',  'Demo Lab Admin',     '+880 1700-000002', 'lab_admin',    true),
      ('reception@userlabeasy.com', 'user@labeasy',  'Demo Receptionist',  '+880 1700-000003', 'receptionist', true),
      ('tester@userlabeasy.com',    'user@labeasy',  'Demo Tester',        '+880 1700-000004', 'tester',       true),
      ('reportist@userlabeasy.com', 'user@labeasy',  'Demo Reportist',     '+880 1700-000005', 'reportist',    true)
    ) as t(email, password, full_name, phone, role, in_lab)
  loop
    select id into uid from auth.users where email = acct.email;

    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        acct.email, crypt(acct.password, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', acct.full_name, 'phone', acct.phone),
        '', '', '', ''
      );
      -- GoTrue refuses the password grant without a matching identity row.
      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), uid, uid::text,
        jsonb_build_object('sub', uid::text, 'email', acct.email),
        'email', now(), now(), now()
      );
    else
      update auth.users
        set encrypted_password = crypt(acct.password, gen_salt('bf')),
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('full_name', acct.full_name, 'phone', acct.phone),
            updated_at         = now()
      where id = uid;
    end if;

    insert into public.user_profiles (user_id, full_name, phone, email, role, status, lab_id)
    values (uid, acct.full_name, acct.phone, acct.email, acct.role, 'active',
            case when acct.in_lab then demo_lab_id else null end)
    on conflict (user_id) do update
      set full_name  = excluded.full_name,
          phone      = excluded.phone,
          email      = excluded.email,
          role       = excluded.role,
          status     = 'active',
          lab_id     = excluded.lab_id,
          updated_at = now();

    if acct.role = 'lab_admin' then
      update public.labs set owner_user_id = uid where id = demo_lab_id;
    end if;
  end loop;
end $$;

-- =============================================================================
-- 16. VERIFY
-- =============================================================================
-- Accounts and their roles:
--   select email, role, status, lab_id from public.user_profiles order by role;
-- Labs awaiting approval:
--   select lab_ref, name, email, status from public.labs order by created_at desc;
-- Today across every lab (what the admin Today page runs):
--   select b.booking_ref, l.name as lab, b.patient_name, b.workflow_status,
--          b.payment_status, b.scheduled_time
--   from public.booked_tests b
--   left join public.labs l on l.id = b.lab_id
--   where b.scheduled_date = current_date
--   order by l.name, b.scheduled_time;
