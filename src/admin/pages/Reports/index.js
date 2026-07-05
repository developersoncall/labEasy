import React, { useState, useEffect } from 'react';
import { reportsData, bookingsData } from '../../adminData';
import { Toast, ConfirmModal, Badge, EmptyState } from '../../components/Shared';
import UploadReportModal from '../../components/UploadReportModal';
import './Reports.css';

const Reports = ({ onChange }) => {
  const [reports, setReports] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [del, setDel] = useState(null);
  const [toast, setToast] = useState(null);
  const toast_ = (msg,type='success') => setToast({msg,type});

  useEffect(() => {
    reportsData.load().then(setReports).catch(e => toast_(e.message || 'Failed to load reports', 'error'));
    // Bookings power the upload dropdown; only completed-ish ones are relevant but load all.
    bookingsData.load().then(setBookings).catch(() => {});
  }, []);

  const filtered = reports.filter(r=>{
    if (tab!=='all' && r.status!==tab) return false;
    if (search && ![r.patient,r.test,String(r.bookingId)].some(f=>f.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const verifyReport = async id => {
    try { await reportsData.setStatus(id,'verified'); setReports(prev=>prev.map(r=>r.id===id?{...r,status:'verified'}:r)); toast_('Report verified'); onChange?.(); }
    catch (e) { toast_(e.message || 'Update failed','error'); }
  };

  const flagReport = async id => {
    try { await reportsData.setStatus(id,'flagged'); setReports(prev=>prev.map(r=>r.id===id?{...r,status:'flagged'}:r)); toast_('Report flagged for review','warning'); }
    catch (e) { toast_(e.message || 'Update failed','error'); }
  };

  const handleUpload = async form => {
    try {
      const saved = await reportsData.create(form);
      setReports(prev=>[saved,...prev]);
      setUploadOpen(false); toast_('Report uploaded successfully'); onChange?.();
    } catch (e) { toast_(e.message || 'Upload failed','error'); }
  };

  const handleDel = async id => {
    try { await reportsData.remove(id); setReports(prev=>prev.filter(r=>r.id!==id)); setDel(null); toast_('Report deleted','error'); onChange?.(); }
    catch (e) { toast_(e.message || 'Delete failed','error'); }
  };

  const viewReport = async r => {
    if (!r.file) { toast_('No file attached to this report', 'error'); return; }
    try {
      const url = await reportsData.downloadUrl(r.file);
      if (url) window.open(url, '_blank', 'noopener');
      else toast_('Could not open the file', 'error');
    } catch (e) { toast_(e.message || 'Could not open the file', 'error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">Manage Reports</div><div className="ph-sub">{reports.filter(r=>r.status==='pending').length} pending validation</div></div>
        <div className="ph-actions"><button className="btn btn-primary" onClick={()=>setUploadOpen(true)}>📤 Upload Report</button></div>
      </div>
      {reports.filter(r=>r.status==='pending').length>0 && (
        <div className="alert alert-yellow">⚠️ {reports.filter(r=>r.status==='pending').length} report(s) are pending verification. Please review.</div>
      )}
      <div className="stat-row">
        {[
          {i:'📄',c:'#1a6fc4',l:'Total Reports',n:reports.length},
          {i:'✅',c:'#0d9488',l:'Verified',n:reports.filter(r=>r.status==='verified').length},
          {i:'⏳',c:'#d97706',l:'Pending',n:reports.filter(r=>r.status==='pending').length},
          {i:'🚩',c:'#dc2626',l:'Flagged',n:reports.filter(r=>r.status==='flagged').length},
        ].map((s,i)=>(
          <div className="stat-card" key={i}><div className="sc-top"><div className="sc-icon" style={{background:s.c+'20'}}>{s.i}</div></div><div className="sc-num">{s.n}</div><div className="sc-label">{s.l}</div></div>
        ))}
      </div>
      <div className="tabs-bar">
        {[['all','All'],['pending','Pending'],['verified','Verified'],['flagged','Flagged']].map(([k,l])=>(
          <button key={k} className={`tab-pill${tab===k?' active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="filter-row">
        <div className="search-input"><span>🔍</span><input placeholder="Search patient, test or booking ID…" value={search} onChange={e=>setSearch(e.target.value)} />{search&&<button className="clear-search" onClick={()=>setSearch('')}>✕</button>}</div>
      </div>
      {filtered.length===0?<EmptyState icon="📄" message="No reports found" />:(
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Report ID</th><th>Booking</th><th>Patient</th><th>Test</th><th>Lab Partner</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(r=>(
              <tr key={r.id}>
                <td><span className="bid">{r.ref}</span></td>
                <td><span style={{color:'var(--accent)',fontWeight:700}}>{r.bookingId}</span></td>
                <td className="user-name">{r.patient}</td>
                <td>{r.test}</td>
                <td className="date-cell">{r.uploadedBy}</td>
                <td className="date-cell">{r.date}</td>
                <td><Badge status={r.status} /></td>
                <td>
                  <div className="actions">
                    <button className="btn btn-secondary btn-sm btn-icon" title="View PDF" onClick={()=>viewReport(r)}>👁</button>
                    {r.status==='pending' && <button className="btn btn-sm btn-primary" onClick={()=>verifyReport(r.id)}>✅ Verify</button>}
                    {r.status==='verified' && <button className="btn btn-sm btn-secondary" onClick={()=>flagReport(r.id)}>🚩 Flag</button>}
                    {r.status==='flagged' && <button className="btn btn-sm btn-primary" onClick={()=>verifyReport(r.id)}>✅ Clear</button>}
                    <button className="btn btn-secondary btn-sm btn-icon del-btn" onClick={()=>setDel(r)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      {uploadOpen && <UploadReportModal bookings={bookings} onClose={()=>setUploadOpen(false)} onUpload={handleUpload} />}
      {del && <ConfirmModal title="Delete Report?" message={`Delete report ${del.id} for ${del.patient}? This cannot be undone.`} confirmLabel="🗑 Delete" danger onConfirm={()=>handleDel(del.id)} onClose={()=>setDel(null)} />}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  );
};
export default Reports;
