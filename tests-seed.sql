-- =============================================================================
--  LABEASY — TEST CATALOGUE SEED  (tests + their sub-tests)
-- =============================================================================
--  Standalone. Touches exactly two tables:
--
--    diagnostic_tests   the bookable test, its category, sample and price
--    test_parameters    the analytes inside it, with unit and reference range
--
--  Nothing else is read or written. Safe to run more than once:
--    * a test is inserted only when no platform test of that name/slug/code
--      already exists
--    * an existing price is never overwritten
--    * sub-tests are seeded only for a test that has none, so anything you
--      have edited in Admin -> Manage Tests survives a re-run
--
--  REQUIRES: section 20 of newSQL.html (it creates test_parameters).
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
