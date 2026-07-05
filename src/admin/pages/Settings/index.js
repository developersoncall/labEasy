import React, { useState, useEffect } from 'react';
import { settingsService } from '../../../services/settingsService.js';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { COUNTRY_OPTIONS } from '../../../config/countries.js';
import { getCountryCode } from '../../../config/runtimeLocale.js';
import { Toast } from '../../components/Shared';

const SOCIALS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'X (Twitter)' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
];

const Settings = () => {
  const { settings, refresh } = useSettings();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const toast_ = (m, type = 'success') => setToast({ msg: m, type });

  // Local editable copy of the site settings, seeded from the live context.
  const [form, setForm] = useState(null);
  useEffect(() => {
    setForm({
      country_code: settings.country_code || getCountryCode(),
      brand_name: settings.brand_name || '',
      brand_tagline: settings.brand_tagline || '',
      contact_email: settings.contact_email || '',
      contact_phone: settings.contact_phone || '',
      contact_address: settings.contact_address || '',
      contact_hours: settings.contact_hours || '',
      socials: SOCIALS.reduce((acc, s) => {
        const v = settings[`social_${s.key}`] || {};
        acc[s.key] = { url: v.url || '', enabled: v.enabled !== false };
        return acc;
      }, {}),
    });
  }, [settings]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setSocial = (key, patch) =>
    setForm((p) => ({ ...p, socials: { ...p.socials, [key]: { ...p.socials[key], ...patch } } }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        country_code: form.country_code,
        brand_name: form.brand_name,
        brand_tagline: form.brand_tagline,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        contact_address: form.contact_address,
        contact_hours: form.contact_hours,
      };
      SOCIALS.forEach((s) => { payload[`social_${s.key}`] = form.socials[s.key]; });
      await settingsService.updateMany(payload);
      // Changing the country changes currency/phone/cities everywhere — a
      // reload guarantees every screen picks up the new preset. refresh()
      // will reload automatically when the country differs.
      await refresh();
      toast_('Settings saved — live across the website');
    } catch (e) {
      toast_(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">App Configuration</div><div className="ph-sub">Control site branding, contact details and social links — saved to Supabase and live across the site</div></div>
      </div>

      {(
        <div className="two-col">
          {/* ── Branding + Contact (live, propagates to footer/contact/etc) ── */}
          <div className="card">
            <div className="card-header"><div className="card-title">Branding &amp; Contact</div></div>
            <div className="card-body"><div className="form-grid">
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label className="form-label">Country</label>
                <select className="form-select" value={form.country_code} onChange={e=>set('country_code',e.target.value)}>
                  {COUNTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="field-error" style={{color:'var(--text-3)',fontWeight:500}}>
                  Sets the currency, phone-number format &amp; cities across the whole site.
                </div>
              </div>
              <div className="form-group"><label className="form-label">Brand Name</label>
                <input className="form-input" value={form.brand_name} onChange={e=>set('brand_name',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Tagline</label>
                <input className="form-input" value={form.brand_tagline} onChange={e=>set('brand_tagline',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Support Email</label>
                <input className="form-input" type="email" value={form.contact_email} onChange={e=>set('contact_email',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Support Phone</label>
                <input className="form-input" value={form.contact_phone} onChange={e=>set('contact_phone',e.target.value)} /></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Address</label>
                <textarea className="form-textarea" rows={2} value={form.contact_address} onChange={e=>set('contact_address',e.target.value)} /></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}><label className="form-label">Support Hours</label>
                <input className="form-input" value={form.contact_hours} onChange={e=>set('contact_hours',e.target.value)} /></div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'⏳ Saving…':'💾 Save Settings'}</button>
              </div>
            </div></div>
          </div>

          {/* ── Social links (enable/disable + url) ── */}
          <div className="card">
            <div className="card-header"><div className="card-title">Social Links</div></div>
            <div className="card-body">
              <p style={{fontSize:'12.5px',color:'var(--text-2)',marginBottom:'14px'}}>Toggle a network off to hide it from the website footer. Changes apply everywhere on save.</p>
              {SOCIALS.map(s=>(
                <div key={s.key} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:'1px solid var(--surface-3)'}}>
                  <label className="toggle">
                    <input type="checkbox" checked={form.socials[s.key].enabled} onChange={e=>setSocial(s.key,{enabled:e.target.checked})}/>
                    <span className="toggle-slider"/>
                  </label>
                  <span style={{width:'90px',fontSize:'13px',fontWeight:700,flexShrink:0}}>{s.label}</span>
                  <input className="form-input" style={{flex:1}} placeholder={`https://…/${s.key}`} value={form.socials[s.key].url} onChange={e=>setSocial(s.key,{url:e.target.value})}/>
                </div>
              ))}
              <div style={{marginTop:'16px'}}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'⏳ Saving…':'💾 Save Settings'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  );
};
export default Settings;
