-- =============================================================================
--  LabEasy — PHASE 2
--  Patient master · Billing · Report depth · Delivery · Accounting
-- =============================================================================
--
--  Run this AFTER newSQL.html sections 1–21. It is additive and idempotent:
--  every statement is `if not exists`, `or replace`, or a `drop … / create`
--  pair, so running it twice changes nothing the second time.
--
--  Sections
--    22  Patient master           patients, booked_tests.patient_id
--    23  Billing                  discount, bill_no, amount_due, booking_payments
--    24  Report depth             age/sex ranges, interpretations, signatures,
--                                 calculated parameters
--    25  Report delivery          report_deliveries, QR verification token
--    26  Accounting               lab_expenses
--    27  Row level security       policies for everything above
--
--  Nothing here drops a column, renames one, or rewrites existing data.
-- =============================================================================


-- =============================================================================
-- 22. PATIENT MASTER
-- =============================================================================
--  Until now a patient existed only as five loose columns on whichever booking
--  happened to mention them. Typing "Ramesh Kumar, 42, male, 98xxxxxx21" again
--  at every visit is both slow and lossy — there was no way to ask what this
--  person was tested for last year.
--
--  A patient is now a row owned by one laboratory. Labs never share patients:
--  the same human walking into two labs is two rows, which is correct, because
--  each lab holds its own record and its own consent.
--
--  Identity is the phone number, normalised to its last ten digits. Names are
--  not unique enough to merge on automatically, so a walk-in with no phone
--  always becomes a new row and a human decides in the UI whether it is really
--  someone they already have.
-- =============================================================================

create sequence if not exists public.patient_ref_seq start 1000;

create table if not exists public.patients (
  id           uuid primary key default gen_random_uuid(),
  lab_id       uuid not null references public.labs(id) on delete cascade,
  patient_ref  text,
  full_name    text not null,
  phone        text default '',
  -- The identity key: last ten digits, so "+91 98765 43210", "098765 43210"
  -- and "9876543210" are one person rather than three.
  phone_key    text generated always as
                 (right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10)) stored,
  email        text default '',
  dob          date,
  -- Last known age, kept because most counter bookings give an age and not a
  -- date of birth. `dob` wins wherever both are present.
  age          int,
  gender       text,
  blood_group  text default '',
  address      text default '',
  city         text default '',
  pincode      text default '',
  notes        text default '',
  visits       int not null default 0,
  last_visit_at timestamptz,
  is_active    boolean not null default true,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.patients add column if not exists patient_ref text;

create index if not exists idx_patients_lab       on public.patients(lab_id);
create index if not exists idx_patients_lab_name  on public.patients(lab_id, lower(full_name));
create index if not exists idx_patients_last_seen on public.patients(lab_id, last_visit_at desc);

-- One phone, one patient, per lab. Rows with no phone are exempt.
create unique index if not exists uq_patients_lab_phone
  on public.patients(lab_id, phone_key)
  where phone_key <> '';

do $$ begin
  alter table public.patients add constraint patients_gender_check
    check (gender is null or gender in ('male', 'female', 'other')) not valid;
exception when duplicate_object then null; end $$;

drop trigger if exists set_updated_at on public.patients;
create trigger set_updated_at before update on public.patients
  for each row execute function public.set_updated_at();

-- A readable reference the counter can say out loud.
create or replace function public.stamp_patient_ref()
returns trigger
language plpgsql
as $$
begin
  if new.patient_ref is null or new.patient_ref = '' then
    new.patient_ref := 'P-' || lpad(nextval('public.patient_ref_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_patient_ref on public.patients;
create trigger trg_stamp_patient_ref before insert on public.patients
  for each row execute function public.stamp_patient_ref();

-- ---- 22.2 the link from a booking -----------------------------------------
alter table public.booked_tests
  add column if not exists patient_id uuid references public.patients(id) on delete set null;

create index if not exists idx_booked_tests_patient on public.booked_tests(patient_id);

/*
 * Every booking lands in the patient register.
 *
 * Security definer because the row is written on behalf of a receptionist who
 * has no direct insert right on `patients` beyond their own lab — the trigger
 * is the only path that creates one implicitly, and it can only ever write to
 * the booking's own lab_id.
 */
create or replace function public.attach_booking_patient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  key text;
  found uuid;
begin
  if new.lab_id is null then
    return new;
  end if;

  -- The receptionist picked an existing patient in the UI: trust it, but only
  -- if that patient really belongs to this lab.
  if new.patient_id is not null then
    select id into found from public.patients
     where id = new.patient_id and lab_id = new.lab_id;
    if found is null then
      new.patient_id := null;
    end if;
  end if;

  if new.patient_id is null and coalesce(new.patient_name, '') <> '' then
    key := right(regexp_replace(coalesce(new.patient_phone, ''), '[^0-9]', '', 'g'), 10);

    if key <> '' then
      select id into found from public.patients
       where lab_id = new.lab_id and phone_key = key
       limit 1;
    end if;

    if found is null then
      insert into public.patients (lab_id, full_name, phone, email, age, gender,
                                   address, city, created_by)
      values (new.lab_id, new.patient_name, coalesce(new.patient_phone, ''),
              coalesce(new.patient_email, ''), new.patient_age, new.patient_gender,
              coalesce(new.address, ''), coalesce(new.city, ''), auth.uid())
      returning id into found;
    end if;

    new.patient_id := found;
  end if;

  -- Keep the register current with whatever this visit established.
  if new.patient_id is not null and tg_op = 'INSERT' then
    update public.patients
       set full_name     = coalesce(nullif(new.patient_name, ''), full_name),
           email         = coalesce(nullif(new.patient_email, ''), email),
           age           = coalesce(new.patient_age, age),
           gender        = coalesce(new.patient_gender, gender),
           address       = coalesce(nullif(new.address, ''), address),
           city          = coalesce(nullif(new.city, ''), city),
           visits        = visits + 1,
           last_visit_at = now()
     where id = new.patient_id;
  end if;

  return new;
end;
$$;

-- Ordered after the workflow trigger by name (t-r-g_a… sorts first, so this
-- one is explicitly named to run before it is irrelevant: both are BEFORE
-- triggers and neither depends on the other's result).
drop trigger if exists trg_attach_booking_patient on public.booked_tests;
create trigger trg_attach_booking_patient
  before insert or update of patient_name, patient_phone on public.booked_tests
  for each row execute function public.attach_booking_patient();

-- ---- 22.3 backfill ---------------------------------------------------------
--  Existing bookings become patient records, newest visit last so `visits` and
--  `last_visit_at` come out right.
do $$
declare
  b record;
  key text;
  found uuid;
begin
  for b in
    select id, lab_id, patient_name, patient_phone, patient_email,
           patient_age, patient_gender, address, city, created_at
      from public.booked_tests
     where lab_id is not null
       and patient_id is null
       and coalesce(patient_name, '') <> ''
     order by created_at
  loop
    key := right(regexp_replace(coalesce(b.patient_phone, ''), '[^0-9]', '', 'g'), 10);
    found := null;

    if key <> '' then
      select id into found from public.patients
       where lab_id = b.lab_id and phone_key = key limit 1;
    else
      select id into found from public.patients
       where lab_id = b.lab_id and lower(full_name) = lower(b.patient_name)
         and coalesce(phone, '') = '' limit 1;
    end if;

    if found is null then
      insert into public.patients (lab_id, full_name, phone, email, age, gender,
                                   address, city, visits, last_visit_at, created_at)
      values (b.lab_id, b.patient_name, coalesce(b.patient_phone, ''),
              coalesce(b.patient_email, ''), b.patient_age, b.patient_gender,
              coalesce(b.address, ''), coalesce(b.city, ''), 1, b.created_at, b.created_at)
      returning id into found;
    else
      update public.patients
         set visits = visits + 1,
             last_visit_at = greatest(coalesce(last_visit_at, b.created_at), b.created_at)
       where id = found;
    end if;

    update public.booked_tests set patient_id = found where id = b.id;
  end loop;
end $$;


-- =============================================================================
-- 23. BILLING
-- =============================================================================
--  Three things were missing to call this billing rather than "a number on a
--  booking": a discount the counter can justify, a bill number the patient can
--  quote, and an amount still owed that is derived rather than typed.
--
--  Partial payments used to overwrite each other — `amount_paid` was a single
--  figure, so "paid 200 now, 300 tomorrow" lost the first line. Payments are
--  now their own rows and `amount_paid` is recomputed from them, which also
--  makes a day's collection a simple sum instead of a guess.
-- =============================================================================

create sequence if not exists public.bill_no_seq start 1;

alter table public.booked_tests add column if not exists subtotal_amount  numeric;
alter table public.booked_tests add column if not exists discount         numeric not null default 0;
alter table public.booked_tests add column if not exists discount_type    text not null default 'amount';
alter table public.booked_tests add column if not exists discount_reason  text default '';
alter table public.booked_tests add column if not exists tax_amount       numeric not null default 0;
alter table public.booked_tests add column if not exists bill_no          text;
alter table public.booked_tests add column if not exists billed_at        timestamptz;

do $$ begin
  alter table public.booked_tests add constraint booked_tests_discount_type_check
    check (discount_type in ('amount', 'percent')) not valid;
exception when duplicate_object then null; end $$;

-- What is still owed. Generated, so no screen can ever show a stale figure and
-- no service can forget to update it.
do $$ begin
  alter table public.booked_tests add column amount_due numeric
    generated always as
      (greatest(coalesce(total_amount, 0) - coalesce(amount_paid, 0), 0)) stored;
exception when duplicate_column then null; end $$;

create index if not exists idx_booked_tests_bill_no on public.booked_tests(bill_no);
create unique index if not exists uq_booked_tests_bill_no
  on public.booked_tests(bill_no) where bill_no is not null;

create or replace function public.stamp_bill_no()
returns trigger
language plpgsql
as $$
begin
  if new.lab_id is not null and (new.bill_no is null or new.bill_no = '') then
    new.bill_no := 'INV-' || to_char(now(), 'YYMM') || '-'
                          || lpad(nextval('public.bill_no_seq')::text, 5, '0');
    new.billed_at := coalesce(new.billed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_bill_no on public.booked_tests;
create trigger trg_stamp_bill_no before insert on public.booked_tests
  for each row execute function public.stamp_bill_no();

-- Give the bookings that already exist a bill number too.
update public.booked_tests
   set bill_no = 'INV-' || to_char(coalesce(created_at, now()), 'YYMM') || '-'
                        || lpad(nextval('public.bill_no_seq')::text, 5, '0'),
       billed_at = coalesce(billed_at, created_at)
 where lab_id is not null and (bill_no is null or bill_no = '');

-- ---- 23.2 payments as rows -------------------------------------------------
create table if not exists public.booking_payments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.booked_tests(id) on delete cascade,
  lab_id      uuid not null references public.labs(id) on delete cascade,
  amount      numeric not null,
  method      text not null default 'cash',
  reference   text default '',
  note        text default '',
  -- A refund is stored as its own row rather than a negative amount, so the
  -- day's takings and the day's refunds can be reported separately.
  is_refund   boolean not null default false,
  received_by uuid references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists idx_booking_payments_booking on public.booking_payments(booking_id);
create index if not exists idx_booking_payments_lab_day on public.booking_payments(lab_id, received_at desc);

do $$ begin
  alter table public.booking_payments add constraint booking_payments_method_check
    check (method in ('cash', 'card', 'upi', 'online', 'cheque', 'bank', 'other')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.booking_payments add constraint booking_payments_amount_check
    check (amount >= 0) not valid;
exception when duplicate_object then null; end $$;

/*
 * The booking's paid figure is whatever its payment rows add up to.
 *
 * Security definer so the recalculation cannot be blocked by the caller's own
 * update policy on booked_tests — the row being corrected is always the one
 * their payment was for. The workflow trigger still runs on that update, so a
 * role that may not advance a booking still cannot advance one this way.
 */
create or replace function public.sync_booking_payment_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.booking_id, old.booking_id);
  paid   numeric;
  total  numeric;
  stage  text;
  method_last text;
begin
  select coalesce(sum(case when is_refund then -amount else amount end), 0)
    into paid
    from public.booking_payments where booking_id = target;

  paid := greatest(paid, 0);

  select coalesce(total_amount, 0), workflow_status
    into total, stage
    from public.booked_tests where id = target;

  select method into method_last
    from public.booking_payments
   where booking_id = target and not is_refund
   order by received_at desc limit 1;

  update public.booked_tests
     set amount_paid     = paid,
         payment_method  = coalesce(method_last, payment_method),
         payment_status  = case
                             when paid <= 0 then 'pending'
                             when paid >= total then 'paid'
                             else 'partial'
                           end,
         payment_collected    = paid >= total and total > 0,
         payment_collected_at = case when paid >= total and total > 0
                                     then coalesce(payment_collected_at, now()) end,
         -- Settling the bill moves a booking out of reception, never backwards
         -- and never past a stage it has already reached.
         workflow_status = case
                             when paid >= total and total > 0
                              and stage in ('booked', 'payment_pending')
                             then 'payment_completed'
                             else stage
                           end,
         updated_at = now()
   where id = target;

  return null;
end;
$$;

drop trigger if exists trg_sync_booking_payment_total on public.booking_payments;
create trigger trg_sync_booking_payment_total
  after insert or update or delete on public.booking_payments
  for each row execute function public.sync_booking_payment_total();

-- ---- 23.3 backfill ---------------------------------------------------------
--  Money already recorded against a booking becomes its first payment row, so
--  the ledger starts complete rather than from today.
insert into public.booking_payments (booking_id, lab_id, amount, method, note, received_at, created_at)
select b.id, b.lab_id, b.amount_paid, coalesce(b.payment_method, 'cash'),
       'Opening balance — recorded before the payment ledger existed',
       coalesce(b.payment_collected_at, b.created_at), coalesce(b.created_at, now())
  from public.booked_tests b
 where b.lab_id is not null
   and coalesce(b.amount_paid, 0) > 0
   and not exists (select 1 from public.booking_payments p where p.booking_id = b.id);

-- Bookings priced before discounts existed: the subtotal is the total.
update public.booked_tests
   set subtotal_amount = total_amount
 where subtotal_amount is null and total_amount is not null;


-- =============================================================================
-- 24. REPORT DEPTH
-- =============================================================================
--  Four things a real report has that ours did not:
--
--    · a reference range that depends on who the patient is. A haemoglobin of
--      13.5 is normal in a man, low-normal in a woman and high in a newborn.
--      One parameter therefore becomes several rows, each with its own window,
--      and the report picks the row that fits the patient in front of it.
--    · a comment. Both a standing one on the parameter ("Values above 200
--      warrant a fasting repeat") and a free one the pathologist writes.
--    · a signature that is a signature, not the words "Approved by".
--    · parameters that are arithmetic on other parameters — A/G ratio, LDL by
--      Friedewald — which no one should be typing by hand.
-- =============================================================================

alter table public.test_parameters add column if not exists age_min        numeric;
alter table public.test_parameters add column if not exists age_max        numeric;
alter table public.test_parameters add column if not exists age_unit       text not null default 'years';
alter table public.test_parameters add column if not exists interpretation text default '';
alter table public.test_parameters add column if not exists formula        text default '';
alter table public.test_parameters add column if not exists is_calculated  boolean not null default false;
alter table public.test_parameters add column if not exists decimals       int;

do $$ begin
  alter table public.test_parameters add constraint test_parameters_age_unit_check
    check (age_unit in ('years', 'months', 'days')) not valid;
exception when duplicate_object then null; end $$;

-- Rows for the same analyte now differ only by their sex/age window, so the
-- lookup wants them grouped.
create index if not exists idx_test_parameters_lookup
  on public.test_parameters(test_id, lower(name), sex);

alter table public.diagnostic_tests add column if not exists interpretation text default '';

-- ---- 24.2 the laboratory's letterhead and signatory -----------------------
alter table public.labs add column if not exists logo_path              text default '';
alter table public.labs add column if not exists signature_path         text default '';
alter table public.labs add column if not exists signatory_name         text default '';
alter table public.labs add column if not exists signatory_designation  text default '';
alter table public.labs add column if not exists signatory_reg_no       text default '';
alter table public.labs add column if not exists report_footer          text default '';
alter table public.labs add column if not exists report_header_note     text default '';

alter table public.user_profiles add column if not exists signature_path  text default '';
alter table public.user_profiles add column if not exists designation     text default '';
alter table public.user_profiles add column if not exists registration_no text default '';

alter table public.medical_reports add column if not exists interpretation text default '';

-- Logos and signatures are printed on every report, so they are public assets
-- of the laboratory rather than patient data. Writing is still folder-scoped.
insert into storage.buckets (id, name, public)
values ('lab-assets', 'lab-assets', true)
on conflict (id) do nothing;

-- ---- 24.3 snapshot the extra context onto issued results ------------------
alter table public.report_values add column if not exists interpretation text default '';
alter table public.report_values add column if not exists method         text default '';


-- =============================================================================
-- 25. REPORT DELIVERY
-- =============================================================================
--  Who was the report sent to, by what route, and can the person holding a
--  printout prove it is genuine.
--
--  The QR code on the report resolves to a token, and the token resolves to a
--  few facts about the report — never to the PDF. A verification page that
--  handed out the document itself to anyone who photographed the paper would
--  be a data leak wearing the costume of a security feature.
-- =============================================================================

alter table public.medical_reports add column if not exists public_token   text;
alter table public.medical_reports add column if not exists delivered_at   timestamptz;
alter table public.medical_reports add column if not exists delivery_count int not null default 0;

create unique index if not exists uq_medical_reports_public_token
  on public.medical_reports(public_token) where public_token is not null;

create or replace function public.stamp_report_token()
returns trigger
language plpgsql
as $$
begin
  if new.public_token is null or new.public_token = '' then
    new.public_token := replace(gen_random_uuid()::text, '-', '');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_report_token on public.medical_reports;
create trigger trg_stamp_report_token before insert on public.medical_reports
  for each row execute function public.stamp_report_token();

update public.medical_reports
   set public_token = replace(gen_random_uuid()::text, '-', '')
 where public_token is null;

create table if not exists public.report_deliveries (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid references public.medical_reports(id) on delete cascade,
  booking_id  uuid references public.booked_tests(id) on delete cascade,
  lab_id      uuid not null references public.labs(id) on delete cascade,
  channel     text not null,
  destination text default '',
  status      text not null default 'sent',
  note        text default '',
  sent_by     uuid references auth.users(id) on delete set null,
  sent_at     timestamptz not null default now()
);

create index if not exists idx_report_deliveries_report  on public.report_deliveries(report_id);
create index if not exists idx_report_deliveries_lab_day on public.report_deliveries(lab_id, sent_at desc);

do $$ begin
  alter table public.report_deliveries add constraint report_deliveries_channel_check
    check (channel in ('whatsapp', 'sms', 'email', 'print', 'download', 'link')) not valid;
exception when duplicate_object then null; end $$;

create or replace function public.bump_report_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.medical_reports
     set delivery_count = coalesce(delivery_count, 0) + 1,
         delivered_at   = coalesce(delivered_at, now())
   where id = new.report_id;
  return null;
end;
$$;

drop trigger if exists trg_bump_report_delivery on public.report_deliveries;
create trigger trg_bump_report_delivery after insert on public.report_deliveries
  for each row execute function public.bump_report_delivery();

/*
 * What a QR code is allowed to reveal.
 *
 * Deliberately thin: enough for a doctor holding the paper to confirm the lab
 * issued it and the date matches, and not enough to identify the patient to a
 * stranger who scanned a discarded printout. The patient's name comes back as
 * a first name and an initial.
 */
create or replace function public.verify_report(p_token text)
returns table (
  found         boolean,
  report_ref    text,
  lab_name      text,
  lab_city      text,
  patient_label text,
  booking_ref   text,
  reported_on   timestamptz,
  status        text,
  is_verified   boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    true,
    r.report_ref,
    l.name,
    l.city,
    case
      when coalesce(b.patient_name, '') = '' then 'Patient'
      else split_part(b.patient_name, ' ', 1) ||
           case when position(' ' in b.patient_name) > 0
                then ' ' || upper(left(split_part(b.patient_name, ' ', 2), 1)) || '.'
                else '' end
    end,
    b.booking_ref,
    coalesce(r.completed_at, r.created_at),
    r.status,
    coalesce(r.is_verified, false)
  from public.medical_reports r
  left join public.labs l         on l.id = r.lab_id
  left join public.booked_tests b on b.id = r.booking_id
  where r.public_token = p_token
    and coalesce(r.is_verified, false) = true
  limit 1;
$$;

grant execute on function public.verify_report(text) to anon, authenticated;


-- =============================================================================
-- 26. ACCOUNTING
-- =============================================================================
--  Collection is already answerable from booking_payments and what is owed
--  from booked_tests.amount_due. The missing half is what went out.
-- =============================================================================

create table if not exists public.lab_expenses (
  id             uuid primary key default gen_random_uuid(),
  lab_id         uuid not null references public.labs(id) on delete cascade,
  spent_on       date not null default current_date,
  category       text not null default 'other',
  description    text default '',
  vendor         text default '',
  amount         numeric not null,
  payment_method text not null default 'cash',
  reference      text default '',
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_lab_expenses_lab_day on public.lab_expenses(lab_id, spent_on desc);

do $$ begin
  alter table public.lab_expenses add constraint lab_expenses_category_check
    check (category in ('reagents', 'consumables', 'salary', 'rent', 'utilities',
                        'equipment', 'maintenance', 'marketing', 'courier',
                        'outsourced_tests', 'tax', 'other')) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.lab_expenses add constraint lab_expenses_amount_check
    check (amount >= 0) not valid;
exception when duplicate_object then null; end $$;

drop trigger if exists set_updated_at on public.lab_expenses;
create trigger set_updated_at before update on public.lab_expenses
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 27. ROW LEVEL SECURITY
-- =============================================================================
--  Same shape as every other lab-owned table: the platform admin sees
--  everything, a lab sees its own rows, and who may write is narrowed to the
--  roles whose job it is.
-- =============================================================================

-- ---- patients --------------------------------------------------------------
alter table public.patients enable row level security;

drop policy if exists "patients admin read" on public.patients;
create policy "patients admin read" on public.patients
  for select to authenticated using (public.is_admin());

drop policy if exists "patients lab read own" on public.patients;
create policy "patients lab read own" on public.patients
  for select to authenticated using (public.has_lab_access(lab_id));

drop policy if exists "patients lab write" on public.patients;
create policy "patients lab write" on public.patients
  for insert to authenticated
  with check (public.has_lab_role(lab_id, 'lab_admin', 'receptionist'));

drop policy if exists "patients lab update" on public.patients;
create policy "patients lab update" on public.patients
  for update to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin', 'receptionist'))
  with check (public.has_lab_role(lab_id, 'lab_admin', 'receptionist'));

drop policy if exists "patients lab_admin delete" on public.patients;
create policy "patients lab_admin delete" on public.patients
  for delete to authenticated using (public.has_lab_role(lab_id, 'lab_admin'));

-- ---- booking payments ------------------------------------------------------
alter table public.booking_payments enable row level security;

drop policy if exists "payments admin read" on public.booking_payments;
create policy "payments admin read" on public.booking_payments
  for select to authenticated using (public.is_admin());

drop policy if exists "payments lab read own" on public.booking_payments;
create policy "payments lab read own" on public.booking_payments
  for select to authenticated using (public.has_lab_access(lab_id));

-- Only the counter takes money.
drop policy if exists "payments lab write" on public.booking_payments;
create policy "payments lab write" on public.booking_payments
  for insert to authenticated
  with check (public.has_lab_role(lab_id, 'lab_admin', 'receptionist'));

-- A recorded payment is a ledger line: correcting one is the Lab Admin's call.
drop policy if exists "payments lab_admin update" on public.booking_payments;
create policy "payments lab_admin update" on public.booking_payments
  for update to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin'))
  with check (public.has_lab_role(lab_id, 'lab_admin'));

drop policy if exists "payments lab_admin delete" on public.booking_payments;
create policy "payments lab_admin delete" on public.booking_payments
  for delete to authenticated using (public.has_lab_role(lab_id, 'lab_admin'));

-- ---- report deliveries -----------------------------------------------------
alter table public.report_deliveries enable row level security;

drop policy if exists "deliveries admin read" on public.report_deliveries;
create policy "deliveries admin read" on public.report_deliveries
  for select to authenticated using (public.is_admin());

drop policy if exists "deliveries lab read own" on public.report_deliveries;
create policy "deliveries lab read own" on public.report_deliveries
  for select to authenticated using (public.has_lab_access(lab_id));

drop policy if exists "deliveries lab write" on public.report_deliveries;
create policy "deliveries lab write" on public.report_deliveries
  for insert to authenticated
  with check (public.has_lab_role(lab_id, 'lab_admin', 'reportist', 'receptionist'));

-- ---- expenses --------------------------------------------------------------
alter table public.lab_expenses enable row level security;

drop policy if exists "expenses admin read" on public.lab_expenses;
create policy "expenses admin read" on public.lab_expenses
  for select to authenticated using (public.is_admin());

-- The books are the Lab Admin's, not the whole lab's.
drop policy if exists "expenses lab_admin all" on public.lab_expenses;
create policy "expenses lab_admin all" on public.lab_expenses
  for all to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin'))
  with check (public.has_lab_role(lab_id, 'lab_admin'));

-- ---- storage: logos and signatures ----------------------------------------
--  Public read (they are printed on every report anyway); writes are confined
--  to the lab's own folder, exactly like lab-docs.
drop policy if exists "lab assets read" on storage.objects;
create policy "lab assets read" on storage.objects
  for select to public using (bucket_id = 'lab-assets');

drop policy if exists "lab assets upload" on storage.objects;
create policy "lab assets upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lab-assets'
    and public.can_manage_lab_docs(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "lab assets update" on storage.objects;
create policy "lab assets update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'lab-assets'
    and public.can_manage_lab_docs(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "lab assets delete" on storage.objects;
create policy "lab assets delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lab-assets'
    and (public.is_admin() or public.can_manage_lab_docs(((storage.foldername(name))[1])::uuid))
  );


-- =============================================================================
--  Done. Reload the PostgREST schema cache so the new columns are visible.
-- =============================================================================
notify pgrst, 'reload schema';
