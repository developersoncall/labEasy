import React, { useState, useEffect } from 'react';
import { packagesData, testsData } from '../../adminData';
import { formatCurrency, currencySymbol } from '../../../utils/helpers.js';
import { Toast, Modal, ConfirmModal, Field, EmptyState } from '../../components/Shared';
import './Packages.css';

const PackageFormModal = ({ pkg, tests = [], onClose, onSave }) => {
  const isEdit = !!pkg;
  const [form, setForm] = useState(pkg || { name:'', price:'', originalPrice:'', active:true, description:'', testList:[] });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k,v) => { setForm(p=>({...p,[k]:v})); setErrors(e=>({...e,[k]:undefined})); };
  const toggleTest = id => setForm(p=>({ ...p, testList: p.testList.includes(id) ? p.testList.filter(t=>t!==id) : [...p.testList,id] }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Package name is required';
    if (!form.price || Number(form.price) <= 0) e.price = 'Enter a valid price';
    if (form.originalPrice && Number(form.originalPrice) < Number(form.price)) e.originalPrice = 'Original price should be ≥ sale price';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handle = async () => {
    if (!validate()) return;
    setSaving(true);
    try { await onSave(isEdit ? form : { ...form, bookings:0, tests:form.testList.length, price:Number(form.price), originalPrice:Number(form.originalPrice) }); }
    finally { setSaving(false); }
  };

  return (
    <Modal size="lg" onClose={onClose}>
      <div className="modal-header">
        <div><div className="modal-user-name">{isEdit?`Edit — ${pkg.name}`:'Add Health Package'}</div><div className="modal-user-meta">{isEdit?'Update package':'Configure package details and tests'}</div></div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div className="form-grid form-grid-2">
          <Field label="Package Name *" error={errors.name}><input className={`form-input${errors.name?' input-error':''}`} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Full Body Checkup" /></Field>
          <Field label="Description"><input className="form-input" value={form.description||''} onChange={e=>set('description',e.target.value)} /></Field>
          <Field label={`Sale Price (${currencySymbol()}) *`} error={errors.price}><input className={`form-input${errors.price?' input-error':''}`} type="number" value={form.price} onChange={e=>set('price',e.target.value)} /></Field>
          <Field label={`Original Price (${currencySymbol()})`} error={errors.originalPrice}><input className={`form-input${errors.originalPrice?' input-error':''}`} type="number" value={form.originalPrice||''} onChange={e=>set('originalPrice',e.target.value)} /></Field>
        </div>
        <div className="toggle-item" style={{marginBottom:16}}>
          <span style={{fontWeight:700,color:'var(--ink)'}}>Active for booking</span>
          <label className="toggle"><input type="checkbox" checked={form.active} onChange={e=>set('active',e.target.checked)}/><span className="toggle-slider"/></label>
        </div>
        <div className="pkg-tests-section">
          <div className="pts-title">Select Tests ({form.testList.length} selected)</div>
          <div className="test-check-grid">
            {tests.map(t=>(
              <label key={t.id} className={`test-check${form.testList.includes(t.id)?' selected':''}`}>
                <input type="checkbox" checked={form.testList.includes(t.id)} onChange={()=>toggleTest(t.id)} />
                <div className="tc-info">
                  <div className="tc-name">{t.name}</div>
                  <div className="tc-price">{formatCurrency(t.price)}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handle} disabled={saving}>{saving?'⏳ Saving…':isEdit?'✅ Save':'+ Add Package'}</button>
      </div>
    </Modal>
  );
};

const Packages = () => {
  const [packages, setPackages] = useState([]);
  const [tests, setTests] = useState([]);
  const [edit, setEdit] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [del, setDel] = useState(null);
  const [toast, setToast] = useState(null);
  const toast_ = (msg,type='success') => setToast({msg,type});

  useEffect(() => {
    packagesData.load().then(setPackages).catch(e => toast_(e.message || 'Failed to load packages', 'error'));
    testsData.load().then(setTests).catch(() => {});
  }, []);

  const toggle = async id => {
    const p = packages.find(x=>x.id===id);
    try { const saved = await packagesData.setActive(id, !p.active); setPackages(prev=>prev.map(x=>x.id===id?saved:x)); toast_('Status updated'); }
    catch (e) { toast_(e.message || 'Update failed','error'); }
  };

  const handleSave = async p => {
    try {
      const existing = packages.find(x=>x.id===p.id);
      const saved = await packagesData.save(p);
      if (existing) { setPackages(prev=>prev.map(x=>x.id===saved.id?saved:x)); toast_(`${saved.name} updated`); }
      else { setPackages(prev=>[...prev,saved]); toast_(`${saved.name} added`); }
      setEdit(null); setAddOpen(false);
    } catch (e) { toast_(e.message || 'Save failed','error'); }
  };
  const handleDel = async id => {
    const name=packages.find(p=>p.id===id)?.name;
    try { await packagesData.remove(id); setPackages(prev=>prev.filter(p=>p.id!==id)); setDel(null); toast_(`${name} deleted`,'error'); }
    catch (e) { toast_(e.message || 'Delete failed','error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">Manage Packages</div><div className="ph-sub">{packages.length} health packages</div></div>
        <div className="ph-actions"><button className="btn btn-primary" onClick={()=>setAddOpen(true)}>+ Add Package</button></div>
      </div>
      <div className="stat-row">
        {[
          {i:'📦',c:'#1a6fc4',l:'Total Packages',n:packages.length},
          {i:'✅',c:'#0d9488',l:'Active',n:packages.filter(p=>p.active).length},
          {i:'🛒',c:'#d97706',l:'Total Bookings',n:packages.reduce((a,p)=>a+p.bookings,0)},
          {i:'💰',c:'#7c3aed',l:'Avg Package Value',n:formatCurrency(packages.length?Math.round(packages.reduce((a,p)=>a+p.price,0)/packages.length):0)},
        ].map((s,i)=>(
          <div className="stat-card" key={i}><div className="sc-top"><div className="sc-icon" style={{background:s.c+'20'}}>{s.i}</div></div><div className="sc-num">{s.n}</div><div className="sc-label">{s.l}</div></div>
        ))}
      </div>
      <div className="pkg-grid">
        {packages.map(p=>{
          const disc = Math.round(((p.originalPrice-p.price)/p.originalPrice)*100);
          return (
            <div className={`pkg-card${!p.active?' pkg-inactive':''}`} key={p.id}>
              <div className="pkg-header">
                <div>
                  <div className="pkg-name">{p.name}</div>
                  <div className="pkg-id">{p.id}</div>
                </div>
                <label className="toggle"><input type="checkbox" checked={p.active} onChange={()=>toggle(p.id)}/><span className="toggle-slider"/></label>
              </div>
              {p.description && <div className="pkg-desc">{p.description}</div>}
              <div className="pkg-price-row">
                <span className="pkg-price">{formatCurrency(p.price)}</span>
                <span className="pkg-original">{formatCurrency(p.originalPrice)}</span>
                <span className="pkg-disc">{disc}% off</span>
              </div>
              <div className="pkg-meta-row">
                <span>🔬 {p.testList?.length||p.tests} Tests</span>
                <span>🛒 {p.bookings} Bookings</span>
              </div>
              <div className="pkg-progress">
                <div className="pkg-fill" style={{width:Math.min((p.bookings/400)*100,100)+'%'}}/>
              </div>
              <div className="pkg-actions">
                <button className="btn btn-secondary btn-sm" onClick={()=>setEdit(p)}>✏️ Edit</button>
                <button className="btn btn-secondary btn-sm del-btn" onClick={()=>setDel(p)}>🗑 Delete</button>
              </div>
            </div>
          );
        })}
        <div className="pkg-add-card" onClick={()=>setAddOpen(true)}>
          <div className="pac-icon">+</div>
          <div className="pac-label">Add New Package</div>
        </div>
      </div>
      {edit&&<PackageFormModal pkg={edit} tests={tests} onClose={()=>setEdit(null)} onSave={handleSave} />}
      {addOpen&&<PackageFormModal tests={tests} onClose={()=>setAddOpen(false)} onSave={handleSave} />}
      {del&&<ConfirmModal title="Delete Package?" message={`Delete "${del.name}"? This will remove it from the app and affect ${del.bookings} past bookings count.`} confirmLabel="🗑 Delete" danger onConfirm={()=>handleDel(del.id)} onClose={()=>setDel(null)} />}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  );
};
export default Packages;
