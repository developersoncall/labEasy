import React, { useState, useEffect } from 'react';
import { ticketsData, reviewsData } from '../../adminData';
import { Avatar, Toast, Modal, Badge, EmptyState } from '../../components/Shared';
import './Support.css';

const PRIORITY_META = {
  high:   { label: 'High priority',   cls: 'prio-high' },
  medium: { label: 'Medium priority', cls: 'prio-medium' },
  low:    { label: 'Low priority',    cls: 'prio-low' },
};

// Read-only ticket view: patient name, email, phone and message, plus a
// status control and a "Reply via Email" action (no in-app reply thread).
const TicketModal = ({ ticket, onClose, onSave }) => {
  const [status, setStatus] = useState(ticket.status);
  const [saving, setSaving] = useState(false);
  const prio = PRIORITY_META[ticket.priority] || PRIORITY_META.medium;
  // The patient's original message is the first entry in messages.
  const message = ticket.messages?.[0]?.text || '';

  const replyByEmail = () => {
    const subject = encodeURIComponent(`Re: ${ticket.subject || 'your message to Lab Easy'}`);
    const body = encodeURIComponent(`Hi ${ticket.user},\n\n\n\n— Lab Easy Support`);
    window.location.href = `mailto:${ticket.email}?subject=${subject}&body=${body}`;
  };

  const save = async () => {
    setSaving(true);
    try { await onSave({ ...ticket, status }); } finally { setSaving(false); }
  };

  return (
    <Modal size="md" onClose={onClose}>
      <div className="modal-header">
        <div className="modal-user-hero">
          <Avatar name={ticket.user} size={44} />
          <div style={{ minWidth: 0 }}>
            <div className="modal-user-name">{ticket.user}</div>
            <div className="modal-user-meta">{ticket.ref} · {ticket.date}</div>
          </div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      <div className="modal-body">
        <span className={`ticket-prio ${prio.cls}`}>{prio.label}</span>

        <div className="ticket-contact">
          {ticket.email
            ? <a className="tc-item" href={`mailto:${ticket.email}`}><span className="tc-ic">✉️</span><span className="tc-text">{ticket.email}</span></a>
            : <div className="tc-item"><span className="tc-ic">✉️</span><span className="tc-text">—</span></div>}
          {ticket.phone
            ? <a className="tc-item" href={`tel:${ticket.phone}`}><span className="tc-ic">📞</span><span className="tc-text">{ticket.phone}</span></a>
            : <div className="tc-item"><span className="tc-ic">📞</span><span className="tc-text">—</span></div>}
        </div>

        {ticket.subject && <div className="ticket-subject">{ticket.subject}</div>}

        <div className="edit-section-title" style={{ marginTop: 18 }}>Message</div>
        <div className="ticket-message">{message || 'No message provided.'}</div>

        <div className="ticket-status-row">
          <span className="ts-label">Status</span>
          <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <Badge status={status} />
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
        <button className="btn btn-secondary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Status'}</button>
        <button className="btn btn-primary" onClick={replyByEmail} disabled={!ticket.email}>✉️ Reply via Email</button>
      </div>
    </Modal>
  );
};

const Support = ({ onChange }) => {
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState('tickets');
  const [statusF, setStatusF] = useState('all');
  const [priorityF, setPriorityF] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const toast_ = (msg,type='success') => setToast({msg,type});

  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    ticketsData.load().then(setTickets).catch(e => toast_(e.message || 'Failed to load tickets', 'error'));
    reviewsData.load().then(setReviews).catch(() => {});
  }, []);

  // Rating distribution + average, computed from real reviews.
  const ratingCounts = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.stars === star).length,
  }));
  const totalReviews = reviews.length || 0;
  const avgRating = totalReviews ? (reviews.reduce((a,r)=>a+r.stars,0)/totalReviews).toFixed(1) : '—';

  const filtered = tickets.filter(t=>{
    if (statusF!=='all' && t.status!==statusF) return false;
    if (priorityF!=='all' && t.priority!==priorityF) return false;
    if (search && ![t.user,t.subject,t.ref,String(t.id)].some(f=>f?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const handleSave = async updated => {
    try {
      const saved = await ticketsData.setStatus(updated.id, updated.status);
      setTickets(prev => prev.map(t => t.id === updated.id ? saved : t));
      setSelected(null);
      toast_('Ticket status updated'); onChange?.();
    } catch (e) { toast_(e.message || 'Update failed', 'error'); }
  };

  const ratings = ratingCounts.map(r => ({ ...r, pct: totalReviews ? Math.round((r.count/totalReviews)*100) : 0 }));

  const pColors = { high:'red', medium:'yellow', low:'green' };

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">Support & Feedback</div><div className="ph-sub">{tickets.filter(t=>t.status==='open').length} open tickets</div></div>
      </div>
      <div className="stat-row">
        {[
          {i:'🎫',c:'#dc2626',l:'Open',n:tickets.filter(t=>t.status==='open').length},
          {i:'🔧',c:'#d97706',l:'In Progress',n:tickets.filter(t=>t.status==='in_progress').length},
          {i:'✅',c:'#0d9488',l:'Resolved',n:tickets.filter(t=>t.status==='resolved').length},
          {i:'⭐',c:'#7c3aed',l:'Avg Rating',n:avgRating},
        ].map((s,i)=>(
          <div className="stat-card" key={i}><div className="sc-top"><div className="sc-icon" style={{background:s.c+'20'}}>{s.i}</div></div><div className="sc-num">{s.n}</div><div className="sc-label">{s.l}</div></div>
        ))}
      </div>
      <div className="tabs-bar">
        {[['tickets','🎫 Support Tickets'],['feedback','⭐ Feedback & Ratings']].map(([k,l])=>(
          <button key={k} className={`tab-pill${tab===k?' active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==='tickets' && <>
        <div className="filter-row">
          <div className="search-input"><span>🔍</span><input placeholder="Search tickets…" value={search} onChange={e=>setSearch(e.target.value)} />{search&&<button className="clear-search" onClick={()=>setSearch('')}>✕</button>}</div>
          <select className="filter-select" value={statusF} onChange={e=>setStatusF(e.target.value)}>
            <option value="all">All Status</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option>
          </select>
          <select className="filter-select" value={priorityF} onChange={e=>setPriorityF(e.target.value)}>
            <option value="all">All Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>
        {filtered.length===0?<EmptyState icon="🎫" message="No tickets found" />:(
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Ticket ID</th><th>Patient</th><th>Subject</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(t=>(
                <tr key={t.id}>
                  <td><span className="bid">{t.ref}</span></td>
                  <td><div className="user-cell"><Avatar name={t.user} size={30} /><div className="user-name">{t.user}</div></div></td>
                  <td>{t.subject}</td>
                  <td><Badge status={pColors[t.priority]||t.priority} /></td>
                  <td><Badge status={t.status} /></td>
                  <td className="date-cell">{t.date}</td>
                  <td><button className="btn btn-primary btn-sm" onClick={()=>setSelected(t)}>💬 Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </>}

      {tab==='feedback' && (
        <div className="feedback-layout">
          <div className="feedback-ratings">
            <div className="section-card"><h3 className="sc-title">Rating Distribution</h3>
              {ratings.map(r=>(
                <div key={r.star} className="rating-row">
                  <span className="rr-star">{'⭐'.repeat(r.star)}</span>
                  <div className="rr-bar"><div className="rr-fill" style={{width:r.pct+'%'}}/></div>
                  <span className="rr-pct">{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="feedback-reviews">
            <div className="section-card"><h3 className="sc-title">Recent Reviews</h3>
              {reviews.length === 0 ? (
                <EmptyState icon="⭐" message="No reviews yet" />
              ) : reviews.map((r)=>(
                <div className="review-card" key={r.id}>
                  <div className="review-header"><Avatar name={r.name} size={32} /><div><div className="user-name">{r.name}</div><div className="user-id">{r.date}{r.doctor?` · ${r.doctor}`:''}</div></div><span className="review-stars">{'⭐'.repeat(r.stars)}</span></div>
                  <p className="review-text">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selected && <TicketModal ticket={selected} onClose={()=>setSelected(null)} onSave={handleSave} />}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  );
};
export default Support;
