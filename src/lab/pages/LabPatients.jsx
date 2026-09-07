import { useCallback, useEffect, useState } from 'react';
import { FaUserPlus, FaEye, FaUsers, FaHistory } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Spinner from '../../components/common/Spinner.jsx';
import PatientDetails from '../components/PatientDetails.jsx';
import PatientEditor from '../components/PatientEditor.jsx';
import { patientService, ageOf } from '../../services/patientService.js';
import { ROLES } from '../../config/platform.js';
import {
  Page, PageHeader, TableFrame, Td, Row, SearchBox, Alert, Stat, StatGrid,
} from '../components/ui.jsx';

/**
 * The people this laboratory has tested.
 *
 * Nobody has to maintain this list: a booking taken at the counter creates or
 * matches the patient behind it, so the register is a by-product of doing the
 * work rather than a second job. This screen is for looking someone up —
 * what were they tested for, what did it show, what do they still owe.
 */
export default function LabPatients() {
  const { labId, role } = useAuth();
  useDocumentTitle('Patients');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [stats, setStats] = useState({ total: 0, newToday: 0 });
  const [detailsFor, setDetailsFor] = useState(null);
  const [editFor, setEditFor] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const canEdit = [ROLES.LAB_ADMIN, ROLES.RECEPTIONIST].includes(role);

  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    try {
      const { patients, schemaMissing: missing } = await patientService.list(labId, { search });
      setRows(patients);
      setSchemaMissing(missing);
      if (!missing) setStats(await patientService.stats(labId).catch(() => stats));
    } catch (err) {
      setError(err?.message || 'Could not load the patient register.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId, search]);

  // One request per pause in typing.
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <Page>
      <PageHeader title="Patients" subtitle="Everyone this laboratory has tested.">
        {canEdit && !schemaMissing && (
          <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
            <FaUserPlus aria-hidden="true" /> Register a patient
          </button>
        )}
      </PageHeader>

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      {schemaMissing ? (
        <Alert tone="warning">
          The patient register needs <code className="font-mono">phase2.sql</code> to be run in the
          Supabase SQL Editor. Bookings keep working without it — patients simply are not stored
          separately yet.
        </Alert>
      ) : (
        <>
          <StatGrid>
            <Stat label="On the register" value={stats.total} icon={<FaUsers />} />
            <Stat label="Registered today" value={stats.newToday} tone="success" icon={<FaUserPlus />} />
            <Stat label="Showing" value={rows.length} tone="muted" hint={search ? 'matching your search' : 'most recent first'} />
          </StatGrid>

          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone or patient ID…"
          />

          {loading ? (
            <Spinner />
          ) : (
            <TableFrame
              head={[
                'Patient', 'Contact', 'Age / Sex', 'Visits', 'Last seen',
                { label: 'Actions', align: 'right' },
              ]}
              empty={rows.length === 0}
              emptyIcon="🧑‍⚕️"
              emptyText={
                search
                  ? 'No patient matches that search.'
                  : 'No patients yet. They are added automatically when you take a booking.'
              }
            >
              {rows.map((p) => {
                const age = ageOf(p);
                return (
                  <Row key={p.id}>
                    <Td>
                      <p className="font-medium text-gray-900">{p.full_name}</p>
                      <p className="font-mono text-[11px] text-gray-400">{p.patient_ref}</p>
                    </Td>
                    <Td className="text-gray-600">
                      {p.phone || <span className="text-gray-300">—</span>}
                      {p.email && <p className="truncate text-xs text-gray-400">{p.email}</p>}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-600">
                      {[age != null ? `${age} yrs` : null, p.gender].filter(Boolean).join(' / ') || '—'}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-gray-700">
                        <FaHistory className="text-gray-300" aria-hidden="true" />
                        {p.visits || 0}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-gray-500">
                      {p.last_visit_at ? new Date(p.last_visit_at).toLocaleDateString() : '—'}
                    </Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        className="btn-soft whitespace-nowrap px-3 py-1.5 text-xs"
                        onClick={() => setDetailsFor(p)}
                      >
                        <FaEye aria-hidden="true" /> Details
                      </button>
                    </Td>
                  </Row>
                );
              })}
            </TableFrame>
          )}
        </>
      )}

      {detailsFor && (
        <PatientDetails
          patient={detailsFor}
          canEdit={canEdit}
          onEdit={() => { setEditFor(detailsFor); setDetailsFor(null); }}
          onClose={() => setDetailsFor(null)}
        />
      )}

      {(addOpen || editFor) && (
        <PatientEditor
          labId={labId}
          patient={editFor}
          onClose={() => { setAddOpen(false); setEditFor(null); }}
          onSaved={async () => { setAddOpen(false); setEditFor(null); await load(); }}
        />
      )}
    </Page>
  );
}
