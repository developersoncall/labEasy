import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaPlus, FaEdit, FaTrash, FaFlask, FaLayerGroup, FaEye, FaEyeSlash, FaBoxOpen,
} from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Spinner from '../../components/common/Spinner.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import TestEditor from '../components/TestEditor.jsx';
import TestImporter from '../components/TestImporter.jsx';
import { labTestService } from '../../services/labTestService.js';
import { formatCurrency } from '../../utils/helpers.js';
import {
  Page, PageHeader, TableFrame, Td, Row, Alert, SearchBox,
} from '../components/ui.jsx';

/**
 * The lab's test catalogue — Lab Admin only.
 *
 * One row here is one bookable, priced test. Inside it sit the analytes that
 * make up its report: CBC is a single test whose parameters are Haemoglobin,
 * RBC, WBC and so on, each with a unit and a reference range. Those parameters
 * are what a tester fills in later, so the catalogue is where the shape of
 * every future report is decided.
 */
export default function LabTests() {
  const { labId } = useAuth();
  useDocumentTitle('Tests');

  const [tests, setTests] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // test | {} for new
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    try {
      const rows = await labTestService.listOwn(labId);
      setTests(rows);

      // How many parameters each test has — shown in the list so an
      // unfinished test is obvious at a glance.
      const entries = await Promise.all(
        rows.map(async (t) => {
          const { parameters, schemaMissing: missing } = await labTestService.parameters(t.id);
          return [t.id, missing ? null : parameters.length];
        }),
      );
      setSchemaMissing(entries.some(([, n]) => n === null));
      setCounts(Object.fromEntries(entries));
    } catch (err) {
      setError(err?.message || 'Could not load your tests.');
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.code || '').toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [tests, search]);

  if (loading) return <Spinner full />;

  return (
    <Page>
      <PageHeader
        title="Tests"
        subtitle="What this laboratory offers, what it costs, and what its report contains."
      >
        <button type="button" className="btn-outline" onClick={() => setImporting(true)}>
          <FaBoxOpen aria-hidden="true" /> Add from library
        </button>
        <button type="button" className="btn-primary" onClick={() => setEditing({})}>
          <FaPlus aria-hidden="true" /> New test
        </button>
      </PageHeader>

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
      {notice && (
        <Alert tone="success" onDismiss={() => setNotice('')}>{notice}</Alert>
      )}
      {schemaMissing && (
        <Alert tone="warning">
          Sub-tests need section 20 of newSQL.html to be run in the Supabase SQL Editor. Tests and
          prices work already; parameters cannot be saved until then.
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {tests.length} test{tests.length === 1 ? '' : 's'} in your catalogue
        </p>
        <SearchBox value={search} onChange={setSearch} placeholder="Name, code or category" />
      </div>

      <TableFrame
        head={['Test', 'Category', 'Sub-tests', 'Sample', 'Price', 'Status', { label: '', align: 'right' }]}
        empty={!visible.length}
        emptyIcon="🧪"
        emptyText={
          tests.length
            ? 'No test matches that search.'
            : 'No tests yet. Add your first one — or start from a template such as CBC.'
        }
      >
        {visible.map((t) => (
          <Row key={t.id}>
            <Td>
              <p className="font-semibold text-gray-900">{t.name}</p>
              {t.code && <p className="font-mono text-xs text-gray-400">{t.code}</p>}
            </Td>
            <Td className="text-gray-600">{t.category}</Td>
            <Td>
              {counts[t.id] == null ? (
                <span className="text-xs text-gray-400">—</span>
              ) : counts[t.id] === 0 ? (
                <span className="badge bg-amber-100 text-amber-800">None yet</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                  <FaLayerGroup className="text-gray-400" aria-hidden="true" />
                  {counts[t.id]}
                </span>
              )}
            </Td>
            <Td className="text-gray-600">{t.sampleType || '—'}</Td>
            <Td className="whitespace-nowrap font-semibold tabular-nums text-gray-900">
              {formatCurrency(t.price)}
            </Td>
            <Td>
              <span className={`badge ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {t.isActive ? 'Bookable' : 'Hidden'}
              </span>
            </Td>
            <Td className="text-right">
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  className="btn-ghost whitespace-nowrap px-3 py-1.5 text-xs"
                  onClick={() => setEditing(t)}
                >
                  <FaEdit aria-hidden="true" /> Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost px-2.5 py-1.5 text-xs"
                  title={t.isActive ? 'Hide from booking' : 'Make bookable'}
                  onClick={async () => {
                    try {
                      await labTestService.setActive(t.id, !t.isActive);
                      await load();
                    } catch (err) {
                      setError(err?.message || 'Could not change that.');
                    }
                  }}
                >
                  {t.isActive ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className="btn-ghost px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setConfirmDelete(t)}
                  aria-label={`Delete ${t.name}`}
                >
                  <FaTrash />
                </button>
              </div>
            </Td>
          </Row>
        ))}
      </TableFrame>

      <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary-900">
          <FaFlask aria-hidden="true" /> How a test becomes a report
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-primary-800">
          The parameters you add here are the rows your tester fills in. Give each one a unit and a
          reference range, and the report flags a value automatically when it falls outside.
        </p>
      </div>

      {importing && (
        <TestImporter
          labId={labId}
          onClose={() => setImporting(false)}
          onImported={async (n) => {
            setImporting(false);
            setNotice(`${n} test${n === 1 ? '' : 's'} added to your catalogue.`);
            await load();
          }}
        />
      )}

      {editing && (
        <TestEditor
          labId={labId}
          test={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={async (name) => {
            setEditing(null);
            setNotice(`“${name}” saved.`);
            await load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        danger
        title="Delete this test?"
        message="The test and its parameters are removed from your catalogue. Bookings already made keep the test details they were created with."
        detail={confirmDelete?.name}
        confirmLabel="Delete test"
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          await labTestService.removeTest(confirmDelete.id);
          setConfirmDelete(null);
          await load();
        }}
      />
    </Page>
  );
}
