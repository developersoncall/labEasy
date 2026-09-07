import { useState } from 'react';
import {
  FaUpload, FaMoneyBillWave, FaPaperPlane, FaPlay, FaCheck, FaCheckDouble, FaFileSignature,
} from 'react-icons/fa';
import { labBookingService, isPaymentSettled } from '../../services/labBookingService.js';
import { labReportService } from '../../services/labReportService.js';
import { ROLES } from '../../config/platform.js';

/**
 * "What is this booking waiting for, and is it waiting for me?"
 *
 * One definition, used by the row in a list and by the details drawer, so a
 * reportist never sees an upload button in one place and not the other. It
 * mirrors enforce_booking_workflow exactly: whatever this returns the database
 * will accept from that role, and whatever it withholds the database refuses.
 *
 * The Lab Admin owns every stage of their lab, so they get whichever step is
 * pending regardless of whose desk it normally sits on.
 */
export function nextStepFor(booking, role, report) {
  if (!booking) return null;
  const s = booking.workflow_status;
  const isAdmin = role === ROLES.LAB_ADMIN;
  const can = (...roles) => isAdmin || roles.includes(role);

  if (s === 'cancelled' || s === 'completed') return null;

  if (['booked', 'payment_pending'].includes(s) && can(ROLES.RECEPTIONIST)) {
    if (!isPaymentSettled(booking)) {
      return { kind: 'payment', label: 'Record payment', icon: <FaMoneyBillWave />, tone: 'btn-primary' };
    }
  }
  if (['booked', 'payment_pending', 'payment_completed'].includes(s) && can(ROLES.RECEPTIONIST)) {
    return isPaymentSettled(booking)
      ? { kind: 'send', label: 'Send to testing', icon: <FaPaperPlane />, tone: 'btn-primary' }
      : { kind: 'blocked', label: 'Payment required first' };
  }
  if (s === 'sent_for_testing' && can(ROLES.TESTER)) {
    return { kind: 'start', label: 'Start testing', icon: <FaPlay />, tone: 'btn-primary' };
  }
  if (s === 'testing_in_progress' && can(ROLES.TESTER)) {
    return { kind: 'testdone', label: 'Mark testing completed', icon: <FaCheck />, tone: 'btn-secondary' };
  }
  // Testing is done: the report desk's turn. Without a report there is one to
  // make; with a report the reportist hands it up rather than closing it.
  if (['testing_completed', 'report_pending'].includes(s) && can(ROLES.REPORTIST)) {
    return report
      ? { kind: 'ready', label: 'Mark report ready', icon: <FaFileSignature />, tone: 'btn-primary' }
      : { kind: 'upload', label: 'Create report', icon: <FaUpload />, tone: 'btn-primary' };
  }

  // The report is out. Closing a booking is the Lab Admin's call alone —
  // everyone else is waiting on that signature.
  if (s === 'report_uploaded') {
    if (isAdmin) {
      return { kind: 'close', label: 'Mark completed', icon: <FaCheckDouble />, tone: 'btn-secondary' };
    }
    if (role === ROLES.REPORTIST) {
      return { kind: 'blocked', label: 'Waiting on the Lab Admin to close it' };
    }
  }

  return null;
}

/**
 * Run a step that needs no extra input. `upload` and `payment` are not here on
 * purpose — they need a file or an amount, so they are handed back to the
 * caller to open the right dialog.
 */
export async function runSimpleStep(kind, booking, { userId, report } = {}) {
  if (kind === 'send') return labBookingService.sendToTesting(booking.id);
  if (kind === 'start') return labBookingService.startTesting(booking.id, userId);
  if (kind === 'testdone') return labBookingService.completeTesting(booking.id);
  if (kind === 'ready') {
    // The PDF is on the booking; hand it to the Lab Admin for sign-off.
    return labBookingService.update(booking.id, { workflow_status: 'report_uploaded' });
  }
  if (kind === 'close') {
    if (report) await labReportService.markCompleted(report.id);
    return labBookingService.markCompleted(booking.id);
  }
  return null;
}

/**
 * The pending step as a button on a table row.
 *
 * Steps that need a dialog (a PDF, an amount) call `onNeedsDialog` so the
 * screen can open the booking's details with that dialog already showing —
 * the file picker lives in one place rather than on every list.
 */
export function NextStepButton({ booking, role, report, userId, onDone, onNeedsDialog, compact = true }) {
  const [busy, setBusy] = useState(false);
  const step = nextStepFor(booking, role, report);
  if (!step) return null;

  if (step.kind === 'blocked') {
    return <span className="whitespace-nowrap text-xs text-amber-600">{step.label}</span>;
  }

  const size = compact ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  const click = async () => {
    if (step.kind === 'upload' || step.kind === 'payment') {
      onNeedsDialog?.(booking, step.kind);
      return;
    }
    setBusy(true);
    try {
      await runSimpleStep(step.kind, booking, { userId, report });
      await onDone?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`${step.tone} whitespace-nowrap ${size}`}
      disabled={busy}
      onClick={click}
    >
      {step.icon} {busy ? 'Working…' : step.label}
    </button>
  );
}
