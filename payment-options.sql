-- =============================================================================
--  LabEasy — PAYMENT OPTIONS
--  Section 28: where money is actually sent
-- =============================================================================
--
--  Run this AFTER newSQL.html (1–21) and phase2.sql (22–27). Additive and
--  idempotent, like every migration before it — running it twice changes
--  nothing the second time.
--
--  What it adds
--    payment_accounts                    a UPI ID, a phone number, a scan-to-pay
--                                        QR image, or bank details
--    booking_payments.payment_account_id  which of those a payment came through
--    storage bucket `payment-qr`          the QR images themselves
--
--  Scope: a row with lab_id = null belongs to the platform and every lab can
--  read it; a row with a lab_id belongs to that laboratory alone. The platform
--  admin manages the first, a Lab Admin the second. One table, because a QR
--  code is the same object either way and splitting it in two would mean
--  writing the same screen twice.
-- =============================================================================


-- =============================================================================
-- 28. PAYMENT ACCOUNTS
-- =============================================================================

create table if not exists public.payment_accounts (
  id             uuid primary key default gen_random_uuid(),
  -- null = the platform's own account, visible to every lab.
  lab_id         uuid references public.labs(id) on delete cascade,
  kind           text not null default 'upi',
  label          text not null default '',

  -- UPI / phone
  upi_id         text default '',
  phone          text default '',

  -- The scan-to-pay image, stored in the `payment-qr` bucket.
  qr_path        text default '',

  -- Bank transfer
  account_name   text default '',
  bank_name      text default '',
  account_number text default '',
  ifsc           text default '',

  instructions   text default '',
  is_active      boolean not null default true,
  -- The one offered first at the counter.
  is_default     boolean not null default false,
  sort_order     int not null default 0,

  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_payment_accounts_lab
  on public.payment_accounts(lab_id, is_active, sort_order);

do $$ begin
  alter table public.payment_accounts add constraint payment_accounts_kind_check
    check (kind in ('upi', 'phone', 'qr', 'bank', 'cash', 'other')) not valid;
exception when duplicate_object then null; end $$;

-- A payment method that names no way of paying is a blank row someone will
-- later mistake for a real option.
do $$ begin
  alter table public.payment_accounts add constraint payment_accounts_detail_check
    check (
      kind = 'cash'
      or coalesce(upi_id, '') <> ''
      or coalesce(phone, '') <> ''
      or coalesce(qr_path, '') <> ''
      or coalesce(account_number, '') <> ''
    ) not valid;
exception when duplicate_object then null; end $$;

-- One default per scope. Two "default" options is the same as none.
create unique index if not exists uq_payment_accounts_default_lab
  on public.payment_accounts(lab_id) where is_default and lab_id is not null;

create unique index if not exists uq_payment_accounts_default_platform
  on public.payment_accounts((true)) where is_default and lab_id is null;

drop trigger if exists set_updated_at on public.payment_accounts;
create trigger set_updated_at before update on public.payment_accounts
  for each row execute function public.set_updated_at();

/*
 * Marking one account default un-marks the previous one, inside the same scope.
 *
 * BEFORE, not AFTER. The unique indexes above are checked as the row is
 * written, which is earlier than an AFTER trigger fires — so an AFTER trigger
 * would never get the chance to clear the old default, and marking a second
 * account default would fail with a constraint error for having done something
 * perfectly reasonable. Clearing it first makes the index a safety net rather
 * than an obstacle.
 *
 * The UPDATE below re-enters this trigger for each row it touches, but with
 * `is_default` false — the guard returns immediately, so there is no recursion.
 */
create or replace function public.sync_default_payment_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.payment_accounts
       set is_default = false, updated_at = now()
     where id <> new.id
       and is_default
       and lab_id is not distinct from new.lab_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_default_payment_account on public.payment_accounts;
create trigger trg_sync_default_payment_account
  before insert or update of is_default on public.payment_accounts
  for each row execute function public.sync_default_payment_account();


-- ---- 28.2 which account a payment came through -----------------------------
--  So that "we took ₹500 by UPI" can later become "we took ₹500 into *this*
--  UPI ID", which is what reconciling a settlement statement needs.
alter table public.booking_payments
  add column if not exists payment_account_id uuid
    references public.payment_accounts(id) on delete set null;

create index if not exists idx_booking_payments_account
  on public.booking_payments(payment_account_id);


-- ---- 28.3 row level security ----------------------------------------------
alter table public.payment_accounts enable row level security;

drop policy if exists "payment accounts admin all" on public.payment_accounts;
create policy "payment accounts admin all" on public.payment_accounts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Any signed-in lab user can read the platform's accounts and their own lab's:
-- a receptionist has to be able to show the patient the QR code.
drop policy if exists "payment accounts read" on public.payment_accounts;
create policy "payment accounts read" on public.payment_accounts
  for select to authenticated
  using (lab_id is null or public.has_lab_access(lab_id));

drop policy if exists "payment accounts lab_admin manage" on public.payment_accounts;
create policy "payment accounts lab_admin manage" on public.payment_accounts
  for all to authenticated
  using (public.has_lab_role(lab_id, 'lab_admin'))
  with check (public.has_lab_role(lab_id, 'lab_admin'));


-- ---- 28.4 storage: the QR images -------------------------------------------
--  Public read, because a QR code exists to be shown to a patient and a signed
--  URL that expires mid-payment helps nobody. Writes stay folder-scoped.
--
--  Paths are `platform/<file>` for the platform's own codes and `<lab_id>/<file>`
--  for a laboratory's.
insert into storage.buckets (id, name, public)
values ('payment-qr', 'payment-qr', true)
on conflict (id) do nothing;

drop policy if exists "payment qr read" on storage.objects;
create policy "payment qr read" on storage.objects
  for select to public using (bucket_id = 'payment-qr');

drop policy if exists "payment qr write" on storage.objects;
create policy "payment qr write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-qr'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] <> 'platform'
        and public.can_manage_lab_docs(((storage.foldername(name))[1])::uuid)
      )
    )
  );

drop policy if exists "payment qr update" on storage.objects;
create policy "payment qr update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'payment-qr'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] <> 'platform'
        and public.can_manage_lab_docs(((storage.foldername(name))[1])::uuid)
      )
    )
  );

drop policy if exists "payment qr delete" on storage.objects;
create policy "payment qr delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-qr'
    and (
      public.is_admin()
      or (
        (storage.foldername(name))[1] <> 'platform'
        and public.can_manage_lab_docs(((storage.foldername(name))[1])::uuid)
      )
    )
  );


-- =============================================================================
--  Done. Reload the PostgREST schema cache so the new table is visible.
-- =============================================================================
notify pgrst, 'reload schema';
