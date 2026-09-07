import React, { useState, useEffect } from 'react';
import { testsData, categoriesData } from '../../adminData';
import { formatCurrency, currencySymbol } from '../../../utils/helpers.js';
import { Avatar, Toast, Modal, ConfirmModal, Field, Badge, EmptyState, SectionTitle } from '../../components/Shared';
import ParametersModal from '../../components/ParametersModal';
import './Tests.css';

/* ── hoisted outside parent to prevent input remounting ── */
const TestFormField = ({ label, field, type='text', options, full, form, errors, onChange }) => (
  <Field label={label} error={errors[field]}>
    {options ? (
      <select className="form-select" value={form[field]} onChange={e=>onChange(field,e.target.value)}>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
    ) : (
      <input className={`form-input${errors[field]?' input-error':''}`} type={type} value={form[field]||''} onChange={e=>onChange(field,e.target.value)} placeholder={label} style={full?{gridColumn:'1/-1'}:{}} />
    )}
  </Field>
);

const TestFormModal = ({ test, categories = [], onClose, onSave }) => {
  const isEdit = !!test;
  const SAMPLE_TYPE_OPTIONS = ['Blood', 'Urine', 'Sputum', 'Saliva', 'Stool', 'Other'];
  const initialSampleType = test?.sampleType || 'Blood';
  const isPreset = ['Blood', 'Urine', 'Sputum', 'Saliva', 'Stool'].includes(initialSampleType);
  const [sampleTypeSelect, setSampleTypeSelect] = useState(isPreset ? initialSampleType : 'Other');
  const [customSampleType, setCustomSampleType] = useState(isPreset ? '' : initialSampleType);

  const [form, setForm] = useState(test || { name:'', category: categories[0]?.name || 'Blood', price:'', time:'', available:true, popular:false, fasting:'No fasting required', prep:'None', description:'', sampleType: 'Blood' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSelectSampleTypeChange = (val) => {
    setSampleTypeSelect(val);
    if (val !== 'Other') {
      set('sampleType', val);
    } else {
      set('sampleType', customSampleType);
    }
  };

  const handleCustomSampleTypeChange = (val) => {
    setCustomSampleType(val);
    set('sampleType', val);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Test name required';
    if (!form.price || isNaN(form.price)) e.price = 'Valid price required';
    if (sampleTypeSelect === 'Other' && !customSampleType.trim()) e.sampleType = 'Custom sample type required';
    setErrors(e); return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r=>setTimeout(r,700));
    setSaving(false);
    onSave(isEdit ? form : { ...form, id:'T'+Date.now().toString().slice(-4), price: Number(form.price) });
  };



  return (
    <Modal size="lg" onClose={onClose}>
      <div className="modal-header">
        <div className="modal-user-hero">
          <div className="test-icon-lg">🔬</div>
          <div>
            <div className="modal-user-name">{isEdit ? `Edit Test — ${test.name}` : 'Add New Test'}</div>
            <div className="modal-user-meta">{isEdit ? test.id : 'Fill in diagnostic test details'}</div>
          </div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <SectionTitle>Test Details</SectionTitle>
        <div className="form-grid form-grid-2">
          <TestFormField label="Test Name *" field="name"  form={form} errors={errors} onChange={set} />
          <TestFormField label="Category" field="category" options={categories.map(c=>c.name)}  form={form} errors={errors} onChange={set} />
          <TestFormField label={`Price (${currencySymbol()}) *`} field="price" type="number"  form={form} errors={errors} onChange={set} />
          <TestFormField label="Turnaround Time" field="time"  form={form} errors={errors} onChange={set} />
          <Field label="Sample Type" error={errors.sampleType}>
            <select className="form-select" value={sampleTypeSelect} onChange={e=>handleSelectSampleTypeChange(e.target.value)}>
              {SAMPLE_TYPE_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          {sampleTypeSelect === 'Other' && (
            <Field label="Specify Sample Type *" error={errors.sampleType}>
              <input className={`form-input${errors.sampleType?' input-error':''}`} type="text" value={customSampleType} onChange={e=>handleCustomSampleTypeChange(e.target.value)} placeholder="e.g. Swab, Hair, Saliva" />
            </Field>
          )}
        </div>
        <div className="form-full">
          <Field label="Description">
            <textarea className="form-textarea" rows={2} value={form.description||''} onChange={e=>set('description',e.target.value)} placeholder="Brief test description…" />
          </Field>
        </div>
        <SectionTitle style={{marginTop:20}}>Preparation Instructions</SectionTitle>
        <div className="form-grid form-grid-2">
          <TestFormField label="Fasting Requirements" field="fasting" options={['No fasting required','4 hour fast required','6 hour fast required','8 hour fast required','10 hour fast required','12 hour fast required']}  form={form} errors={errors} onChange={set} />
          <TestFormField label="Prep Notes" field="prep"  form={form} errors={errors} onChange={set} />
        </div>
        <SectionTitle style={{marginTop:20}}>Visibility</SectionTitle>
        <div className="toggle-row-form">
          <div className="toggle-item">
            <span>Available for booking</span>
            <label className="toggle"><input type="checkbox" checked={form.available} onChange={e=>set('available',e.target.checked)}/><span className="toggle-slider"/></label>
          </div>
          <div className="toggle-item">
            <span>Mark as popular</span>
            <label className="toggle"><input type="checkbox" checked={form.popular} onChange={e=>set('popular',e.target.checked)}/><span className="toggle-slider"/></label>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Saving…' : isEdit ? '✅ Save Changes' : '+ Add Test'}
        </button>
      </div>
    </Modal>
  );
};

const ViewTest = ({ test, onClose, onEdit }) => (
  <Modal size="md" onClose={onClose}>
    <div className="modal-header">
      <div className="modal-user-hero">
        <div className="test-icon-lg">🔬</div>
        <div>
          <div className="modal-user-name">{test.name}</div>
          <div className="modal-user-meta">{test.id} · {test.category}</div>
        </div>
        <Badge status={test.available ? 'available' : 'unavailable'} />
      </div>
      <button className="modal-close" onClick={onClose}>✕</button>
    </div>
    <div className="modal-body">
      <div className="test-view-grid">
        <div className="tv-card"><div className="tv-label">Price</div><div className="tv-val accent">{formatCurrency(test.price)}</div></div>
        <div className="tv-card"><div className="tv-label">Turnaround</div><div className="tv-val">{test.time}</div></div>
        <div className="tv-card"><div className="tv-label">Popular</div><div className="tv-val">{test.popular ? '⭐ Yes' : 'No'}</div></div>
        <div className="tv-card"><div className="tv-label">Category</div><div className="tv-val">{test.category}</div></div>
      </div>
      {test.description && <div className="test-desc"><strong>Description:</strong> {test.description}</div>}
      <div className="test-prep-card">
        <div className="prep-row"><span className="prep-icon">🧪</span><div><div className="prep-label">Sample Type</div><div>{test.sampleType || 'Blood'}</div></div></div>
        <div className="prep-row"><span className="prep-icon">🍽️</span><div><div className="prep-label">Fasting</div><div>{test.fasting}</div></div></div>
        <div className="prep-row"><span className="prep-icon">📋</span><div><div className="prep-label">Preparation</div><div>{test.prep}</div></div></div>
      </div>
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary" onClick={onClose}>Close</button>
      <button className="btn btn-primary" onClick={()=>{onClose();onEdit(test);}}>✏️ Edit Test</button>
    </div>
  </Modal>
);

const CategoryModal = ({ cat, onClose, onSave }) => {
  const isEdit = !!cat;
  const [form, setForm] = useState(cat || { name:'', icon:'🔬', color:'#1a6fc4' });
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    if (!form.name.trim()) return;
    setSaving(true); await new Promise(r=>setTimeout(r,600)); setSaving(false);
    onSave(isEdit ? form : { ...form, id:'C'+Date.now().toString().slice(-4), tests:0 });
  };
  return (
    <Modal size="sm" onClose={onClose}>
      <div className="modal-header">
        <div className="modal-user-name">{isEdit ? `Edit — ${cat.name}` : 'Add Category'}</div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div className="form-grid form-grid-2">
          <Field label="Category Name *">
            <input className="form-input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Blood Tests" />
          </Field>
          <Field label="Icon (emoji)">
            <input className="form-input" value={form.icon} onChange={e=>setForm(p=>({...p,icon:e.target.value}))} placeholder="🔬" />
          </Field>
          <Field label="Color">
            <input className="form-input" type="color" value={form.color} onChange={e=>setForm(p=>({...p,color:e.target.value}))} />
          </Field>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handle} disabled={saving}>{saving?'⏳ Saving…':isEdit?'✅ Save':'+ Add'}</button>
      </div>
    </Modal>
  );
};

/* ─── MAIN ─────────────────────────────── */
const Tests = ({ initialTab = 'tests' }) => {
  const [tests, setTests] = useState([]);
  const [cats, setCats] = useState([]);
  const [tab, setTab] = useState(initialTab);
  const [catFilter, setCatFilter] = useState('All');
  const [availFilter, setAvailFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState(null);
  const [edit, setEdit] = useState(null);
  // Sub-tests: the analytes a report for this test will contain.
  const [params, setParams] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [delTest, setDelTest] = useState(null);
  const [catModal, setCatModal] = useState(null);
  const [delCat, setDelCat] = useState(null);
  const [toast, setToast] = useState(null);
  const toast_ = (msg, type='success') => setToast({msg,type});

  useEffect(() => {
    testsData.load().then(setTests).catch(e => toast_(e.message || 'Failed to load tests', 'error'));
    categoriesData.load().then(setCats).catch(() => {});
  }, []);

  const filtered = tests.filter(t => {
    if (catFilter !== 'All' && t.category !== catFilter) return false;
    if (availFilter === 'available' && !t.available) return false;
    if (availFilter === 'unavailable' && t.available) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleAvail = async id => {
    const t = tests.find(x=>x.id===id);
    try {
      const saved = await testsData.setAvailable(id, !t.available);
      setTests(prev => prev.map(x => x.id===id ? saved : x));
      toast_('Availability updated');
    } catch (e) { toast_(e.message || 'Update failed','error'); }
  };

  const handleSaveTest = async t => {
    try {
      const existing = tests.find(x=>x.id===t.id);
      const saved = await testsData.save(t);
      if (existing) { setTests(prev=>prev.map(x=>x.id===saved.id?saved:x)); toast_(`${saved.name} updated`); }
      else { setTests(prev=>[saved,...prev]); toast_(`${saved.name} added`); }
      setEdit(null); setAddOpen(false);
    } catch (e) { toast_(e.message || 'Save failed','error'); }
  };

  const handleDelTest = async id => {
    const name = tests.find(t=>t.id===id)?.name;
    try { await testsData.remove(id); setTests(prev=>prev.filter(t=>t.id!==id)); setDelTest(null); toast_(`${name} deleted`,'error'); }
    catch (e) { toast_(e.message || 'Delete failed','error'); }
  };

  const handleSaveCat = async c => {
    try {
      const existing = cats.find(x=>x.id===c.id);
      const saved = await categoriesData.save(c);
      if (existing) { setCats(prev=>prev.map(x=>x.id===saved.id?saved:x)); toast_(`${saved.name} updated`); }
      else { setCats(prev=>[...prev,saved]); toast_(`${saved.name} added`); }
      setCatModal(null);
    } catch (e) { toast_(e.message || 'Save failed','error'); }
  };

  const handleDelCat = async id => {
    const name = cats.find(c=>c.id===id)?.name;
    try { await categoriesData.remove(id); setCats(prev=>prev.filter(c=>c.id!==id)); setDelCat(null); toast_(`${name} deleted`,'error'); }
    catch (e) { toast_(e.message || 'Delete failed','error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">Manage Tests</div><div className="ph-sub">{tests.length} diagnostic tests in catalogue</div></div>
        <div className="ph-actions">
          {tab==='tests' && <button className="btn btn-primary" onClick={()=>setAddOpen(true)}>+ Add Test</button>}
          {tab==='categories' && <button className="btn btn-primary" onClick={()=>setCatModal('add')}>+ Add Category</button>}
        </div>
      </div>

      <div className="stat-row">
        {[
          {i:'🔬',c:'#1a6fc4',l:'Total Tests',n:tests.length},
          {i:'✅',c:'#0d9488',l:'Available',n:tests.filter(t=>t.available).length},
          {i:'⭐',c:'#d97706',l:'Popular',n:tests.filter(t=>t.popular).length},
          {i:'📁',c:'#7c3aed',l:'Categories',n:cats.length},
        ].map((s,i)=>(
          <div className="stat-card" key={i}>
            <div className="sc-top"><div className="sc-icon" style={{background:s.c+'20'}}>{s.i}</div></div>
            <div className="sc-num">{s.n}</div><div className="sc-label">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="tabs-bar">
        {[['tests','🔬 All Tests'],['categories','📁 Categories'],['prep','📋 Prep Guide']].map(([k,l])=>(
          <button key={k} className={`tab-pill${tab===k?' active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==='tests' && <>
        <div className="filter-row">
          <div className="search-input">
            <span>🔍</span>
            <input placeholder="Search tests…" value={search} onChange={e=>setSearch(e.target.value)} />
            {search && <button className="clear-search" onClick={()=>setSearch('')}>✕</button>}
          </div>
          <select className="filter-select" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
            <option>All</option>
            {cats.map(c=><option key={c.id}>{c.name}</option>)}
          </select>
          <select className="filter-select" value={availFilter} onChange={e=>setAvailFilter(e.target.value)}>
            <option value="all">All Availability</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
        {filtered.length===0 ? <EmptyState icon="🔬" message="No tests found" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Test</th><th>Category</th><th>Price</th><th>Turnaround</th><th>Fasting</th><th>Popular</th><th>Available</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(t=>(
                <tr key={t.id}>
                  <td>
                    <div className="user-cell">
                      <div className="test-cat-dot" style={{background:cats.find(c=>c.name===t.category)?.color||'#1a6fc4'}}/>
                      <div>
                        <div className="user-name">{t.name}</div>
                        <div className="user-id">{t.id} · {t.sampleType || 'Blood'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="cat-badge">{t.category}</span></td>
                  <td><span className="price-val">{formatCurrency(t.price)}</span></td>
                  <td className="date-cell">{t.time}</td>
                  <td className="date-cell">{t.fasting?.split(' ').slice(0,2).join(' ')}</td>
                  <td>{t.popular ? <span className="badge badge-yellow">⭐ Popular</span> : <span style={{color:'var(--text-3)',fontSize:12}}>—</span>}</td>
                  <td>
                    <label className="toggle">
                      <input type="checkbox" checked={t.available} onChange={()=>toggleAvail(t.id)}/>
                      <span className="toggle-slider"/>
                    </label>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-secondary btn-sm btn-icon" title="View" onClick={()=>setView(t)}>👁</button>
                      <button className="btn btn-secondary btn-sm btn-icon" title="Edit" onClick={()=>setEdit(t)}>✏️</button>
                      <button className="btn btn-secondary btn-sm" title="Sub-tests" onClick={()=>setParams(t)}>🧬 Sub-tests</button>
                      <button className="btn btn-secondary btn-sm btn-icon del-btn" title="Delete" onClick={()=>setDelTest(t)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </>}

      {tab==='categories' && (
        <div className="cat-grid">
          {cats.map(c=>(
            <div className="cat-card" key={c.id}>
              <div className="cat-icon" style={{background:c.color+'20',color:c.color}}>{c.icon}</div>
              <div className="cat-info">
                <div className="cat-name">{c.name}</div>
                <div className="cat-count">{tests.filter(t=>t.category===c.name).length} tests</div>
              </div>
              <div className="cat-actions">
                <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>setCatModal(c)}>✏️</button>
                <button className="btn btn-secondary btn-sm btn-icon del-btn" onClick={()=>setDelCat(c)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='prep' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Test</th><th>Category</th><th>Fasting</th><th>Preparation Notes</th></tr></thead>
            <tbody>
              {tests.map(t=>(
                <tr key={t.id}>
                  <td><div className="user-name">{t.name}</div></td>
                  <td><span className="cat-badge">{t.category}</span></td>
                  <td>{t.fasting}</td>
                  <td className="date-cell">{t.prep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {params && (
        <ParametersModal
          test={params}
          onClose={()=>setParams(null)}
          onSaved={(n)=>{ setParams(null); toast_(n + " sub-test(s) saved"); }}
        />
      )}
      {view && <ViewTest test={view} onClose={()=>setView(null)} onEdit={t=>{setView(null);setEdit(t);}} />}
      {edit && <TestFormModal test={edit} categories={cats} onClose={()=>setEdit(null)} onSave={handleSaveTest} />}
      {addOpen && <TestFormModal categories={cats} onClose={()=>setAddOpen(false)} onSave={handleSaveTest} />}
      {delTest && (
        <ConfirmModal title="Delete Test?" message={`Delete "${delTest.name}"? This cannot be undone.`} confirmLabel="🗑 Delete" danger onConfirm={()=>handleDelTest(delTest.id)} onClose={()=>setDelTest(null)} />
      )}
      {catModal && catModal!=='add' && <CategoryModal cat={catModal} onClose={()=>setCatModal(null)} onSave={handleSaveCat} />}
      {catModal==='add' && <CategoryModal onClose={()=>setCatModal(null)} onSave={handleSaveCat} />}
      {delCat && <ConfirmModal title="Delete Category?" message={`Delete "${delCat.name}"? Tests in this category will not be deleted.`} confirmLabel="🗑 Delete" danger onConfirm={()=>handleDelCat(delCat.id)} onClose={()=>setDelCat(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  );
};

export default Tests;
