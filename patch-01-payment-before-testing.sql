-- =============================================================================
--  PATCH 01 — PAYMENT BEFORE TESTING
-- =============================================================================
--  Run this in the Supabase SQL Editor if you have ALREADY run newSQL.html.
--  It only replaces the workflow trigger function; nothing else changes and
--  it is safe to run more than once. (A fresh run of newSQL.html already
--  includes this — you do not need both.)
--
--  After this, moving a booking to `sent_for_testing` raises an error unless
--  its payment_status is 'paid' (or 'waived' for labs that bill separately),
--  whoever makes the call and however they make it.
-- =============================================================================
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
