import { useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import LabForm from '../../components/lab/LabForm.jsx';
import LabDocuments from '../components/LabDocuments.jsx';
import ReportSettings from '../components/ReportSettings.jsx';
import { labService } from '../../services/labService.js';
import { Page, PageHeader, Card, Alert } from '../components/ui.jsx';

/**
 * Lab profile, editable by the Lab Admin.
 *
 * Status and approval fields are absent on purpose — `protect_lab_status`
 * silently keeps the old values for anyone who is not a platform admin, so
 * offering them here would be a lie.
 */
export default function LabSettings() {
  const { lab, refreshIdentity } = useAuth();
  useDocumentTitle('Lab Settings');

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const save = async (values) => {
    setError('');
    setSaved(false);
    try {
      await labService.updateProfile(lab.id, {
        name: values.name,
        contact_person: values.contactPerson,
        phone: values.phone,
        license_no: values.licenseNo,
        registration_no: values.registrationNo,
        address: values.address,
        city: values.city,
        pincode: values.pincode,
        description: values.description,
      });
      await refreshIdentity();
      setSaved(true);
    } catch (err) {
      setError(err?.message || 'Could not save the changes.');
    }
  };

  return (
    <Page>
      <PageHeader title="Lab Settings" subtitle="Your laboratory's details as they appear across the platform." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            {saved && (
              <div className="mb-5">
                <Alert tone="success" onDismiss={() => setSaved(false)}>
                  <FaCheckCircle className="mr-1.5 inline" aria-hidden="true" /> Changes saved.
                </Alert>
              </div>
            )}
            {error && <div className="mb-5"><Alert onDismiss={() => setError('')}>{error}</Alert></div>}
            <LabForm
              defaultValues={{
                name: lab?.name || '',
                contactPerson: lab?.contact_person || '',
                phone: lab?.phone || '',
                licenseNo: lab?.license_no || '',
                registrationNo: lab?.registration_no || '',
                address: lab?.address || '',
                city: lab?.city || '',
                pincode: lab?.pincode || '',
                description: lab?.description || '',
              }}
              onSubmit={save}
              submitLabel="Save changes"
            />
          </Card>

          <div className="mt-6">
            <ReportSettings />
          </div>

          <div className="mt-6">
            <LabDocuments />
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="p-6">
            <h2 className="text-sm font-bold text-gray-900">Account</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Reference</dt>
                <dd className="font-mono text-gray-800">{lab?.lab_ref || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Login email</dt>
                <dd className="truncate text-gray-800">{lab?.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Status</dt>
                <dd><span className="badge bg-emerald-100 text-emerald-700 capitalize">{lab?.status}</span></dd>
              </div>
            </dl>
          </Card>

          <Card className="bg-primary-50 p-6 text-sm text-primary-900">
            <p className="font-semibold">Need the status changed?</p>
            <p className="mt-1 text-primary-700">
              Approval, suspension and the login email are managed by the platform administrator.
            </p>
          </Card>
        </aside>
      </div>
    </Page>
  );
}
