/**
 * The bill the patient walks out with.
 *
 * Shares the report's letterhead deliberately — the same laboratory issued
 * both, and a receipt that looks like it came from somewhere else is the sort
 * of thing patients query at the counter. Typography follows the report: a
 * Times masthead over Helvetica figures, and every number right-aligned in a
 * tabular column so a column of rupees reads as a column.
 *
 * jsPDF is imported dynamically, so the receptionist's browser only downloads
 * it when a receipt is actually printed.
 */

const BRAND = [2, 132, 199];
const INK = [17, 24, 39];
const MUTED = [107, 114, 128];
const RULE = [226, 232, 240];
const GOOD = [4, 120, 87];

const money = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const METHODS = {
  cash: 'Cash', card: 'Card', upi: 'UPI', online: 'Online',
  cheque: 'Cheque', bank: 'Bank transfer', other: 'Other',
};

export async function buildReceiptPdf({ lab, booking, payments = [], items = [], issuedBy }) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default || autoTableModule.autoTable;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const CONTENT = W - M * 2;

  const labName = lab?.name || 'Laboratory';

  doc.setProperties({
    title: `${labName} — Bill ${booking?.bill_no || booking?.booking_ref || ''}`.trim(),
    subject: 'Laboratory invoice',
    author: labName,
    creator: labName,
  });

  // ---------------------------------------------------------------- header --
  doc.setTextColor(...INK).setFont('times', 'bold').setFontSize(17);
  doc.text(labName, M, 16);

  const sub = [lab?.address, lab?.city].filter(Boolean).join(', ');
  const contact = [lab?.phone, lab?.email].filter(Boolean).join('  ·  ');
  doc.setFont('helvetica', 'normal').setFontSize(7.8).setTextColor(...MUTED);
  if (sub) doc.text(doc.splitTextToSize(sub, CONTENT * 0.6)[0], M, 21);
  if (contact) doc.text(contact, M, 25);

  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...BRAND);
  doc.text('BILL / RECEIPT', W - M, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(7.8).setTextColor(...MUTED);
  if (booking?.bill_no) doc.text(booking.bill_no, W - M, 21, { align: 'right' });
  doc.text(new Date(booking?.billed_at || booking?.created_at || Date.now()).toLocaleString(),
    W - M, 25, { align: 'right' });

  doc.setDrawColor(...BRAND).setLineWidth(0.9);
  doc.line(M, 28.5, W - M, 28.5);

  // -------------------------------------------------------- patient block --
  const panelTop = 33;
  const panelH = 18;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(M, panelTop, CONTENT, panelH, 1.5, 1.5, 'F');

  const pairs = [
    ['Patient', booking?.patient_name || 'Walk-in patient'],
    ['Booking', booking?.booking_ref || '—'],
    ['Phone', booking?.patient_phone || '—'],
    ['Date', booking?.scheduled_date || '—'],
  ];
  const colX = [M + 5, M + CONTENT / 2 + 2];
  pairs.forEach(([label, value], i) => {
    const x = colX[i % 2];
    const y = panelTop + 6.5 + Math.floor(i / 2) * 6;
    doc.setFont('helvetica', 'bold').setFontSize(7.2).setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK);
    doc.text(doc.splitTextToSize(String(value), CONTENT / 2 - 28)[0], x + 20, y);
  });

  let y = panelTop + panelH + 8;

  // ---------------------------------------------------------------- items --
  const lines = (items.length ? items : []).map((t, i) => [
    String(i + 1),
    t.name || t.title || 'Test',
    t.code || '',
    money(t.price),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Investigation', 'Code', 'Amount']],
    body: lines.length ? lines : [['1', 'Laboratory services', '', money(booking?.subtotal_amount ?? booking?.total_amount)]],
    margin: { left: M, right: M },
    theme: 'plain',
    tableWidth: CONTENT,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: INK,
      cellPadding: { top: 2.4, bottom: 2.4, left: 1.5, right: 1.5 },
      lineColor: RULE,
      overflow: 'linebreak',
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 7.4,
      textColor: MUTED,
      fillColor: [255, 255, 255],
      lineWidth: { bottom: 0.4 },
      lineColor: RULE,
    },
    bodyStyles: { lineWidth: { bottom: 0.15 }, lineColor: [241, 245, 249] },
    columnStyles: {
      0: { cellWidth: CONTENT * 0.07, halign: 'center', textColor: MUTED },
      1: { cellWidth: CONTENT * 0.55 },
      2: { cellWidth: CONTENT * 0.16, textColor: MUTED },
      3: { cellWidth: CONTENT * 0.22, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ------------------------------------------------------------- totals ----
  //  A narrow column on the right, the way every invoice sets them out.
  const subtotal = Number(booking?.subtotal_amount ?? booking?.total_amount ?? 0);
  const total = Number(booking?.total_amount ?? 0);
  const discountValue = Math.max(subtotal - total + Number(booking?.tax_amount || 0), 0);
  const paid = payments
    .filter((p) => !p.is_refund)
    .reduce((n, p) => n + Number(p.amount || 0), 0);
  const refunded = payments
    .filter((p) => p.is_refund)
    .reduce((n, p) => n + Number(p.amount || 0), 0);
  const netPaid = Math.max(paid - refunded, 0);
  const due = Math.max(total - netPaid, 0);

  const rows = [
    ['Subtotal', money(subtotal), false],
    ...(discountValue > 0
      ? [[
        `Discount${booking?.discount_type === 'percent' ? ` (${booking.discount}%)` : ''}`,
        `− ${money(discountValue)}`, false,
      ]]
      : []),
    ...(Number(booking?.tax_amount || 0) > 0 ? [['Tax', money(booking.tax_amount), false]] : []),
    ['Total', money(total), true],
    ['Paid', money(netPaid), false],
    ...(refunded > 0 ? [['Refunded', money(refunded), false]] : []),
    ['Balance due', money(due), true],
  ];

  const boxW = 72;
  const boxX = W - M - boxW;
  rows.forEach(([label, value, strong]) => {
    if (strong) {
      doc.setDrawColor(...RULE).setLineWidth(0.3);
      doc.line(boxX, y - 3.4, W - M, y - 3.4);
    }
    doc.setFont('helvetica', strong ? 'bold' : 'normal').setFontSize(strong ? 10 : 9);
    doc.setTextColor(...(strong ? INK : MUTED));
    doc.text(label, boxX, y);
    doc.setTextColor(...INK);
    doc.text(value, W - M, y, { align: 'right' });
    y += strong ? 6.4 : 5.4;
  });

  if (due <= 0 && total > 0) {
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...GOOD);
    doc.text('PAID IN FULL', boxX, y + 1);
    y += 7;
  }

  // ------------------------------------------------------ payment history --
  if (payments.length) {
    y += 4;
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...BRAND);
    doc.text('PAYMENTS RECEIVED', M, y);
    y += 2.5;

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: payments.map((p) => [
        new Date(p.received_at).toLocaleString(),
        METHODS[p.method] || p.method || '—',
        p.reference || (p.is_refund ? 'Refund' : ''),
        `${p.is_refund ? '− ' : ''}${money(p.amount)}`,
      ]),
      margin: { left: M, right: M },
      theme: 'plain',
      tableWidth: CONTENT,
      styles: {
        font: 'helvetica', fontSize: 8.6, textColor: INK,
        cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      },
      headStyles: {
        fontStyle: 'bold', fontSize: 7.2, textColor: MUTED,
        fillColor: [255, 255, 255], lineWidth: { bottom: 0.4 }, lineColor: RULE,
      },
      bodyStyles: { lineWidth: { bottom: 0.15 }, lineColor: [241, 245, 249] },
      columnStyles: {
        0: { cellWidth: CONTENT * 0.32 },
        1: { cellWidth: CONTENT * 0.2 },
        2: { cellWidth: CONTENT * 0.26, textColor: MUTED },
        3: { cellWidth: CONTENT * 0.22, halign: 'right' },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ------------------------------------------------------------ sign-off ---
  const signY = Math.max(y + 10, H - 38);
  doc.setDrawColor(...MUTED).setLineWidth(0.3);
  doc.line(W - M - 58, signY, W - M, signY);
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...INK);
  doc.text(issuedBy || labName, W - M, signY + 4.6, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
  doc.text('Authorised signatory', W - M, signY + 8.8, { align: 'right' });

  if (booking?.discount_reason) {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
    doc.text(`Discount: ${booking.discount_reason}`, M, signY + 4.6);
  }

  doc.setDrawColor(...RULE).setLineWidth(0.3);
  doc.line(M, H - 15, W - M, H - 15);
  doc.setTextColor(...MUTED).setFont('helvetica', 'normal').setFontSize(7);
  doc.text(lab?.report_footer || 'Thank you. Please retain this receipt for your records.', M, H - 10.5);
  doc.text(booking?.bill_no || '', W - M, H - 10.5, { align: 'right' });

  return doc.output('blob');
}

export default buildReceiptPdf;
