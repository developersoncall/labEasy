/**
 * The departments a diagnostic test belongs to.
 *
 * A list rather than free text for the same reason units are: "Haematology",
 * "haematology" and "Hematology" split one department into three on every
 * filter and every report. The editor still allows a custom value, because no
 * fixed list survives contact with a specialist lab.
 */
export const TEST_CATEGORIES = [
  'Haematology',
  'Biochemistry',
  'Clinical Pathology',
  'Microbiology',
  'Serology',
  'Immunology',
  'Hormones',
  'Molecular / PCR',
  'Histopathology',
  'Cytology',
  'Allergy',
  'Vitamins & Minerals',
  'Cardiac Markers',
  'Tumour Markers',
  'Coagulation',
  'Urine Analysis',
  'Health Packages',
  'General',
];
