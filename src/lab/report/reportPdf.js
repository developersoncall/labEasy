/**
 * Turn an approved result sheet into the PDF stored against the booking.
 *
 * jsPDF is imported dynamically so ~350 KB of PDF machinery only loads for the
 * person actually generating a report — never for a receptionist taking a
 * booking or a visitor reading the home page.
 *
 * Typography: a Times letterhead over Helvetica data. That is how a printed
 * lab report reads — a serif masthead for the laboratory's name, a clean sans
 * for numbers that have to line up. Columns are computed from the content
 * width so every table on every page shares one grid, and the result column is
 * right-aligned against its unit so a decimal point never wanders.
 */

const BRAND = [2, 132, 199]; // primary-600
const INK = [17, 24, 39];
const MUTED = [107, 114, 128];
const RULE = [226, 232, 240];
const HIGH = [185, 28, 28];
const LOW = [180, 83, 9];

const FLAG_TEXT = { low: 'L', high: 'H', abnormal: 'A', normal: '', '': '' };

/** Values grouped the way the report reads: by test, then by sub-heading. */
export function groupRows(rows) {
  const groups = [];
  rows.forEach((r) => {
    const key = `${r.testName || ''}::${r.groupLabel || ''}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(r);
    else groups.push({ key, testName: r.testName, groupLabel: r.groupLabel, rows: [r] });
  });
  return groups;
}

/**
 * Fetch an image and hand jsPDF something it can embed.
 *
 * Returns null rather than throwing: a laboratory whose logo failed to load
 * should still get its report. A missing signature is a cosmetic problem; a
 * report that would not generate is a clinical one.
 */
async function loadImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const size = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
    if (!size?.w) return null;
    return { dataUrl, ...size };
  } catch {
    return null;
  }
}

/** The QR a doctor can scan to confirm the lab really issued this report. */
async function loadQr(url) {
  if (!url) return null;
  try {
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(url, { margin: 0, width: 240, errorCorrectionLevel: 'M' });
  } catch {
    return null;
  }
}

export async function buildReportPdf({
  lab, booking, rows, preparedBy, approvedBy, notes, comments = [], verifyLink,
}) {
  const [{ jsPDF }, autoTableModule, logo, signature, qr] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImage(lab?.logoUrl),
    loadImage(lab?.signatureUrl),
    loadQr(verifyLink),
  ]);
  const autoTable = autoTableModule.default || autoTableModule.autoTable;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const CONTENT = W - M * 2;

  const labName = lab?.name || 'Laboratory';

  doc.setProperties({
    title: `${labName} — Report ${booking?.booking_ref || ''}`.trim(),
    subject: 'Laboratory report',
    author: labName,
    creator: labName,
  });

  // ---------------------------------------------------------------- header --
  const headed = new Set();
  const header = () => {
    // The laboratory's own letterhead — never the platform's name.
    let textX = M;
    if (logo) {
      // Fit inside a 16 mm band, keeping the aspect ratio whatever was uploaded.
      const h = 14;
      const w = Math.min((logo.w / logo.h) * h, 34);
      doc.addImage(logo.dataUrl, M, 8, w, h, undefined, 'FAST');
      textX = M + w + 5;
    }

    doc.setTextColor(...INK).setFont('times', 'bold').setFontSize(17);
    doc.text(labName, textX, 16);

    const sub = [lab?.address, lab?.city].filter(Boolean).join(', ');
    const contact = [lab?.phone, lab?.email].filter(Boolean).join('  ·  ');
    doc.setFont('helvetica', 'normal').setFontSize(7.8).setTextColor(...MUTED);
    if (sub) doc.text(doc.splitTextToSize(sub, CONTENT * 0.5)[0], textX, 21);
    if (contact) doc.text(contact, textX, 25);

    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...BRAND);
    doc.text('LABORATORY REPORT', W - M, 16, { align: 'right' });
    doc.setFont('helvetica', 'normal').setFontSize(7.8).setTextColor(...MUTED);
    if (lab?.lab_ref) doc.text(lab.lab_ref, W - M, 21, { align: 'right' });
    if (booking?.booking_ref) doc.text(booking.booking_ref, W - M, 25, { align: 'right' });

    doc.setDrawColor(...BRAND).setLineWidth(0.9);
    doc.line(M, 28.5, W - M, 28.5);
    headed.add(doc.internal.getCurrentPageInfo().pageNumber);
  };

  /** Draw the letterhead only if this page has not had one yet. */
  const headerOnce = () => {
    if (!headed.has(doc.internal.getCurrentPageInfo().pageNumber)) header();
  };

  const footer = (pageNo, pageCount) => {
    doc.setDrawColor(...RULE).setLineWidth(0.3);
    doc.line(M, H - 15, W - M, H - 15);
    doc.setTextColor(...MUTED).setFont('helvetica', 'normal').setFontSize(7);
    doc.text(
      lab?.report_footer
        || 'Results relate only to the sample tested · Please correlate clinically',
      M, H - 10.5,
    );
    doc.text(`${pageNo} / ${pageCount}`, W - M, H - 10.5, { align: 'right' });
  };

  header();

  // -------------------------------------------------------- patient block --
  //  Two aligned columns of label/value pairs on a tinted panel.
  const panelTop = 33;
  const panelH = 24;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(M, panelTop, CONTENT, panelH, 1.5, 1.5, 'F');

  const pairs = [
    ['Patient', booking?.patient_name || 'Walk-in patient'],
    ['Booking', booking?.booking_ref || '—'],
    [
      'Age / Sex',
      [booking?.patient_age ? `${booking.patient_age} yrs` : null, booking?.patient_gender]
        .filter(Boolean).join(' / ') || '—',
    ],
    ['Collected', booking?.scheduled_date || '—'],
    ['Phone', booking?.patient_phone || '—'],
    ['Reported', new Date().toLocaleString()],
  ];

  const colX = [M + 5, M + CONTENT / 2 + 2];
  const labelW = 20;
  pairs.forEach(([label, value], i) => {
    const x = colX[i % 2];
    const y = panelTop + 6.5 + Math.floor(i / 2) * 6;
    doc.setFont('helvetica', 'bold').setFontSize(7.2).setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK);
    const maxW = CONTENT / 2 - labelW - 8;
    doc.text(doc.splitTextToSize(String(value), maxW)[0], x + labelW, y);
  });

  let y = panelTop + panelH + 8;

  // ------------------------------------------------------------- results --
  //  One grid for every table: widths add up to CONTENT exactly.
  const COLS = {
    0: { cellWidth: CONTENT * 0.38, halign: 'left' },
    // The value sits centred under its heading — columnStyles apply to the
    // head row too, so the label and the number share one axis.
    1: { cellWidth: CONTENT * 0.13, halign: 'center', fontStyle: 'bold' },
    2: { cellWidth: CONTENT * 0.13, halign: 'left' },
    3: { cellWidth: CONTENT * 0.29, halign: 'left' },
    4: { cellWidth: CONTENT * 0.07, halign: 'center' },
  };

  groupRows(rows).forEach((group) => {
    const title = group.groupLabel
      ? `${group.testName} — ${group.groupLabel}`
      : group.testName || 'Results';

    // Keep a heading with at least a couple of its rows.
    if (y > H - 55) { doc.addPage(); headerOnce(); y = 36; }

    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...BRAND);
    doc.text(title.toUpperCase(), M, y);
    y += 2.5;

    autoTable(doc, {
      startY: y,
      head: [['Investigation', 'Result', 'Unit', 'Reference range', 'Flag']],
      body: group.rows.map((r) => [
        // The method belongs under the analyte it qualifies, the way a printed
        // report sets it — not in a column of its own that is blank for most.
        r.method ? `${r.parameterName}\n${r.method}` : r.parameterName,
        String(r.value ?? '') || '—',
        r.unit || '',
        r.refRange || '',
        FLAG_TEXT[r.flag] ?? '',
      ]),
      margin: { left: M, right: M, top: 34, bottom: 20 },
      theme: 'plain',
      tableWidth: CONTENT,
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: INK,
        cellPadding: { top: 2.2, bottom: 2.2, left: 1.5, right: 1.5 },
        lineColor: RULE,
        lineWidth: 0,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fontStyle: 'bold',
        fontSize: 7.4,
        textColor: MUTED,
        fillColor: [255, 255, 255],
        lineWidth: { bottom: 0.4 },
        lineColor: RULE,
        cellPadding: { top: 1.5, bottom: 2, left: 1.5, right: 1.5 },
      },
      bodyStyles: { lineWidth: { bottom: 0.15 }, lineColor: [241, 245, 249] },
      columnStyles: COLS,
      // Out-of-range values earn the only colour on the page.
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const row = group.rows[data.row.index];
        const flag = row?.flag;
        const colour = flag === 'low' ? LOW : (flag === 'high' || flag === 'abnormal') ? HIGH : null;
        if (colour && (data.column.index === 1 || data.column.index === 4)) {
          data.cell.styles.textColor = colour;
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 3) data.cell.styles.textColor = MUTED;
        // The method line rides along under the name at a quieter size.
        if (data.column.index === 0 && row?.method) data.cell.styles.fontSize = 8.2;
      },
      willDrawPage: () => { headerOnce(); },
    });

    y = doc.lastAutoTable.finalY + 8;
  });

  // --------------------------------------------------------------- notes --
  //  The pathologist's own words first, then any standing comment the
  //  catalogue attaches to a parameter that came back out of range.
  const allNotes = [notes, ...comments].filter(Boolean);
  if (allNotes.length) {
    if (y > H - 50) { doc.addPage(); headerOnce(); y = 36; }
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...BRAND);
    doc.text('INTERPRETATION', M, y);
    y += 5;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK);
    allNotes.forEach((note) => {
      const lines = doc.splitTextToSize(note, CONTENT);
      if (y + lines.length * 4.6 > H - 45) { doc.addPage(); headerOnce(); y = 36; }
      doc.text(lines, M, y);
      y += lines.length * 4.6 + 2.5;
    });
    y += 4;
  }

  // ------------------------------------------------------------- sign-off --
  if (y > H - 46) { doc.addPage(); headerOnce(); y = 40; }
  y = Math.max(y + 12, H - 44);

  // The signature image sits on the rule, not above a second one.
  const signW = 62;
  if (signature) {
    const h = 12;
    const w = Math.min((signature.w / signature.h) * h, signW - 6);
    doc.addImage(signature.dataUrl, W - M - w, y - h - 1, w, h, undefined, 'FAST');
  }

  doc.setDrawColor(...MUTED).setLineWidth(0.3);
  doc.line(W - M - signW, y, W - M, y);
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...INK);
  doc.text(approvedBy || labName, W - M, y + 4.6, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
  doc.text(
    [lab?.signatory_designation || 'Lab Admin', lab?.signatory_reg_no]
      .filter(Boolean).join(' · '),
    W - M, y + 8.8, { align: 'right' },
  );

  if (preparedBy) {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
    doc.text(`Prepared by ${preparedBy}`, M, y + 4.6);
  }
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
  doc.text('*** End of report ***', M, y + 8.8);

  // The QR verifies the report; it never carries the report.
  if (qr) {
    const size = 17;
    doc.addImage(qr, M, y - size - 3, size, size, undefined, 'FAST');
    doc.setFont('helvetica', 'normal').setFontSize(6.4).setTextColor(...MUTED);
    doc.text('Scan to verify', M + size + 2, y - size + 4);
    doc.text('this report', M + size + 2, y - size + 7);
  }

  // Footers need the final page count, so they are stamped last.
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    footer(i, pages);
  }

  return doc.output('blob');
}

export default buildReportPdf;
