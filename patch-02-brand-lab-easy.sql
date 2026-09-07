-- =============================================================================
--  PATCH 02 — PRODUCT NAME: "Lab Easy"
-- =============================================================================
--  Your settings row currently holds "LabEasy" (set by the first run of
--  newSQL.html). This renames it to "Lab Easy" everywhere the app reads the
--  brand from the database — the header, page titles, emails and the admin
--  panel all follow this single row.
--
--  Safe to run more than once. A fresh run of newSQL.html already sets this.
-- =============================================================================
insert into public.settings (key, value) values
  ('brand_name',    '"Lab Easy"'::jsonb),
  ('brand_tagline', '"Diagnostics, organised."'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Verify:
select key, value from public.settings where key in ('brand_name', 'brand_tagline');
