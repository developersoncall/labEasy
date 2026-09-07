/**
 * Starting points for common panels.
 *
 * Typing fourteen analytes with units and ranges by hand is the reason a lab
 * would give up halfway through setting up its catalogue, so the editor offers
 * these as a first draft. They are ordinary adult reference ranges — a lab is
 * expected to edit them to match its own analyser and population, which is why
 * they land in the editor rather than being written straight to the database.
 */
export const TEST_TEMPLATES = [
  {
    key: 'cbc',
    name: 'CBC (Complete Blood Count)',
    category: 'Haematology',
    sampleType: 'Whole blood (EDTA)',
    parameters: [
      { name: 'Haemoglobin (Hb)', unit: 'g/dL', refRange: '12.0 – 15.5', refLow: 12, refHigh: 15.5 },
      { name: 'RBC Count', unit: 'x10^6/µL', refRange: '3.80 – 4.80', refLow: 3.8, refHigh: 4.8 },
      { name: 'WBC Count', unit: '/µL', refRange: '4,000 – 11,000', refLow: 4000, refHigh: 11000 },
      { name: 'Platelet Count', unit: 'x10^5/µL', refRange: '1.50 – 4.10', refLow: 1.5, refHigh: 4.1 },
      { name: 'Haematocrit (PCV)', unit: '%', refRange: '36.0 – 46.0', refLow: 36, refHigh: 46 },
      { name: 'MCV', unit: 'fL', refRange: '80.0 – 100.0', refLow: 80, refHigh: 100 },
      { name: 'MCH', unit: 'pg', refRange: '27.0 – 32.0', refLow: 27, refHigh: 32 },
      { name: 'MCHC', unit: 'g/dL', refRange: '31.5 – 34.5', refLow: 31.5, refHigh: 34.5 },
      { name: 'RDW', unit: '%', refRange: '11.5 – 15.0', refLow: 11.5, refHigh: 15 },
      { name: 'Neutrophils', unit: '%', refRange: '40 – 75', refLow: 40, refHigh: 75, groupLabel: 'Differential count' },
      { name: 'Lymphocytes', unit: '%', refRange: '20 – 45', refLow: 20, refHigh: 45, groupLabel: 'Differential count' },
      { name: 'Monocytes', unit: '%', refRange: '2 – 10', refLow: 2, refHigh: 10, groupLabel: 'Differential count' },
      { name: 'Eosinophils', unit: '%', refRange: '1 – 6', refLow: 1, refHigh: 6, groupLabel: 'Differential count' },
      { name: 'Basophils', unit: '%', refRange: '0 – 2', refLow: 0, refHigh: 2, groupLabel: 'Differential count' },
    ],
  },
  {
    key: 'lipid',
    name: 'Lipid Profile',
    category: 'Biochemistry',
    sampleType: 'Serum',
    fastingRequired: true,
    parameters: [
      { name: 'Total Cholesterol', unit: 'mg/dL', refRange: '< 200', refHigh: 200 },
      { name: 'Triglycerides', unit: 'mg/dL', refRange: '< 150', refHigh: 150 },
      { name: 'HDL Cholesterol', unit: 'mg/dL', refRange: '40 – 60', refLow: 40, refHigh: 60 },
      { name: 'LDL Cholesterol', unit: 'mg/dL', refRange: '< 100', refHigh: 100 },
      { name: 'VLDL Cholesterol', unit: 'mg/dL', refRange: '5 – 40', refLow: 5, refHigh: 40 },
      { name: 'Total Cholesterol / HDL Ratio', unit: '', refRange: '< 4.5', refHigh: 4.5 },
    ],
  },
  {
    key: 'lft',
    name: 'Liver Function Test (LFT)',
    category: 'Biochemistry',
    sampleType: 'Serum',
    parameters: [
      { name: 'Total Bilirubin', unit: 'mg/dL', refRange: '0.3 – 1.2', refLow: 0.3, refHigh: 1.2 },
      { name: 'Direct Bilirubin', unit: 'mg/dL', refRange: '0.0 – 0.3', refLow: 0, refHigh: 0.3 },
      { name: 'SGPT (ALT)', unit: 'U/L', refRange: '7 – 56', refLow: 7, refHigh: 56 },
      { name: 'SGOT (AST)', unit: 'U/L', refRange: '5 – 40', refLow: 5, refHigh: 40 },
      { name: 'Alkaline Phosphatase', unit: 'U/L', refRange: '44 – 147', refLow: 44, refHigh: 147 },
      { name: 'Total Protein', unit: 'g/dL', refRange: '6.0 – 8.3', refLow: 6, refHigh: 8.3 },
      { name: 'Albumin', unit: 'g/dL', refRange: '3.5 – 5.5', refLow: 3.5, refHigh: 5.5 },
    ],
  },
  {
    key: 'thyroid',
    name: 'Thyroid Profile (T3, T4, TSH)',
    category: 'Hormones',
    sampleType: 'Serum',
    parameters: [
      { name: 'T3 (Triiodothyronine)', unit: 'ng/dL', refRange: '80 – 200', refLow: 80, refHigh: 200 },
      { name: 'T4 (Thyroxine)', unit: 'µg/dL', refRange: '5.1 – 14.1', refLow: 5.1, refHigh: 14.1 },
      { name: 'TSH', unit: 'µIU/mL', refRange: '0.27 – 4.20', refLow: 0.27, refHigh: 4.2 },
    ],
  },
  {
    key: 'kft',
    name: 'Kidney Function Test (KFT)',
    category: 'Biochemistry',
    sampleType: 'Serum',
    parameters: [
      { name: 'Blood Urea', unit: 'mg/dL', refRange: '17 – 43', refLow: 17, refHigh: 43 },
      { name: 'Serum Creatinine', unit: 'mg/dL', refRange: '0.6 – 1.1', refLow: 0.6, refHigh: 1.1 },
      { name: 'Uric Acid', unit: 'mg/dL', refRange: '2.6 – 6.0', refLow: 2.6, refHigh: 6 },
      { name: 'Sodium', unit: 'mmol/L', refRange: '136 – 145', refLow: 136, refHigh: 145 },
      { name: 'Potassium', unit: 'mmol/L', refRange: '3.5 – 5.1', refLow: 3.5, refHigh: 5.1 },
      { name: 'Chloride', unit: 'mmol/L', refRange: '98 – 107', refLow: 98, refHigh: 107 },
    ],
  },
  {
    key: 'sugar',
    name: 'Blood Sugar (Fasting & PP)',
    category: 'Biochemistry',
    sampleType: 'Fluoride plasma',
    fastingRequired: true,
    parameters: [
      { name: 'Fasting Blood Sugar', unit: 'mg/dL', refRange: '70 – 100', refLow: 70, refHigh: 100 },
      { name: 'Post Prandial Blood Sugar', unit: 'mg/dL', refRange: '< 140', refHigh: 140 },
      { name: 'HbA1c', unit: '%', refRange: '4.0 – 5.6', refLow: 4, refHigh: 5.6 },
    ],
  },
];

export const templateByKey = (key) => TEST_TEMPLATES.find((t) => t.key === key);
