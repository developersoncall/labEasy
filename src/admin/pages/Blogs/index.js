import React, { useState, useEffect } from 'react';
import { blogsData } from '../../adminData';
import { Toast, Modal, ConfirmModal, Field, EmptyState } from '../../components/Shared';
import './Blogs.css';

const BlogFormModal = ({ blog, onClose, onSave }) => {
  const isEdit = !!blog;
  const [form, setForm] = useState(
    blog
      ? { ...blog, tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '' }
      : {
          title: '',
          category: 'General',
          authorName: 'Admin',
          authorRole: 'Lab Easy Team',
          coverImageUrl: '',
          publishedAt: new Date().toISOString().split('T')[0],
          readMinutes: 5,
          tags: '',
          excerpt: '',
          content: '',
          isPublished: true,
        }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await blogsData.uploadCover(file);
      set('coverImageUrl', url);
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.content.trim()) e.content = 'Article content is required';
    if (!form.publishedAt) e.publishedAt = 'Publish date is required';
    if (!form.readMinutes || Number(form.readMinutes) <= 0) e.readMinutes = 'Enter valid read minutes';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handle = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        readMinutes: Number(form.readMinutes),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal size="lg" onClose={onClose}>
      <div className="modal-header">
        <div>
          <div className="modal-user-name">{isEdit ? `Edit — ${blog.title}` : 'Add Blog Article'}</div>
          <div className="modal-user-meta">{isEdit ? 'Update health article' : 'Write and configure a new wellness article'}</div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div className="form-grid form-grid-2">
          <Field label="Article Title *" error={errors.title}>
            <input
              className={`form-input${errors.title ? ' input-error' : ''}`}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. 5 Benefits of Daily Cardio"
            />
          </Field>
          <Field label="Category">
            <select
              className="form-select"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            >
              <option value="General">General</option>
              <option value="Nutrition">Nutrition</option>
              <option value="Lab Tests">Lab Tests</option>
              <option value="Specialties">Specialties</option>
              <option value="Wellness">Wellness</option>
              <option value="Lifestyle">Lifestyle</option>
              <option value="Infections">Infections</option>
            </select>
          </Field>
          <Field label="Author Name">
            <input
              className="form-input"
              value={form.authorName}
              onChange={(e) => set('authorName', e.target.value)}
              placeholder="e.g. Dr. Ananya Iyer"
            />
          </Field>
          <Field label="Author Role">
            <input
              className="form-input"
              value={form.authorRole}
              onChange={(e) => set('authorRole', e.target.value)}
              placeholder="e.g. Clinical Pathologist"
            />
          </Field>
          <Field label="Cover Image" error={errors.coverImageUrl}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.coverImageUrl && (
                <div style={{ position: 'relative', width: '100%', height: 100, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={form.coverImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => set('coverImageUrl', '')}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}
                  >
                    ✕
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  value={form.coverImageUrl}
                  onChange={(e) => set('coverImageUrl', e.target.value)}
                  placeholder="Paste URL or upload file"
                  style={{ flex: 1 }}
                />
                <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '10px 14px', flexShrink: 0 }}>
                  {uploading ? '⏳ uploading...' : '📤 Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          </Field>
          <Field label="Publish Date *" error={errors.publishedAt}>
            <input
              className={`form-input${errors.publishedAt ? ' input-error' : ''}`}
              type="date"
              value={form.publishedAt}
              onChange={(e) => set('publishedAt', e.target.value)}
            />
          </Field>
          <Field label="Read Duration (Minutes) *" error={errors.readMinutes}>
            <input
              className={`form-input${errors.readMinutes ? ' input-error' : ''}`}
              type="number"
              value={form.readMinutes}
              onChange={(e) => set('readMinutes', e.target.value)}
            />
          </Field>
          <Field label="Tags (Comma separated)">
            <input
              className="form-input"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="e.g. nutrition, protein, heart"
            />
          </Field>
        </div>

        <Field label="Excerpt / Short Summary">
          <textarea
            className="form-input"
            style={{ height: 60, resize: 'vertical', padding: '8px 12px' }}
            value={form.excerpt}
            onChange={(e) => set('excerpt', e.target.value)}
            placeholder="A short snippet shown on list cards..."
          />
        </Field>

        <Field label="Article Content *" error={errors.content}>
          <textarea
            className={`form-input${errors.content ? ' input-error' : ''}`}
            style={{ height: 200, resize: 'vertical', padding: '12px', fontFamily: 'inherit', lineHeight: 1.6 }}
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            placeholder="Write full article body text here. Separate paragraphs with double newlines."
          />
        </Field>

        <div className="toggle-item" style={{ marginVertical: 16,marginTop: 16 }}>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>Publish immediately</span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => set('isPublished', e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handle} disabled={saving}>
          {saving ? '⏳ Saving…' : isEdit ? '✅ Save Changes' : '+ Add Article'}
        </button>
      </div>
    </Modal>
  );
};

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [edit, setEdit] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [del, setDel] = useState(null);
  const [toast, setToast] = useState(null);
  const toast_ = (msg, type = 'success') => setToast({ msg, type });

  const loadBlogs = () => {
    blogsData.load()
      .then(setBlogs)
      .catch((e) => toast_(e.message || 'Failed to load blogs', 'error'));
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const handlePublishToggle = async (id) => {
    const blog = blogs.find((x) => x.id === id);
    try {
      const saved = await blogsData.save({ ...blog, isPublished: !blog.isPublished });
      setBlogs((prev) => prev.map((x) => (x.id === id ? saved : x)));
      toast_('Publish status updated');
    } catch (e) {
      toast_(e.message || 'Toggle failed', 'error');
    }
  };

  const handleSave = async (b) => {
    try {
      const existing = blogs.find((x) => x.id === b.id);
      const saved = await blogsData.save(b);
      if (existing) {
        setBlogs((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
        toast_(`"${saved.title}" updated`);
      } else {
        setBlogs((prev) => [saved, ...prev]);
        toast_(`"${saved.title}" added`);
      }
      setEdit(null);
      setAddOpen(false);
    } catch (e) {
      toast_(e.message || 'Save failed', 'error');
    }
  };

  const handleDel = async (id) => {
    const title = blogs.find((b) => b.id === id)?.title;
    try {
      await blogsData.remove(id);
      setBlogs((prev) => prev.filter((b) => b.id !== id));
      setDel(null);
      toast_(`"${title}" deleted`, 'error');
    } catch (e) {
      toast_(e.message || 'Delete failed', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ph-title">Manage Blogs</div>
          <div className="ph-sub">{blogs.length} articles in CMS</div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>+ Add Blog</button>
        </div>
      </div>

      <div className="stat-row">
        {[
          { i: '✍️', c: '#1a6fc4', l: 'Total Articles', n: blogs.length },
          { i: '🟢', c: '#0d9488', l: 'Published', n: blogs.filter((b) => b.isPublished).length },
          { i: '⚪', c: '#d97706', l: 'Drafts', n: blogs.filter((b) => !b.isPublished).length },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="sc-top">
              <div className="sc-icon" style={{ background: s.c + '20' }}>{s.i}</div>
            </div>
            <div className="sc-num">{s.n}</div>
            <div className="sc-label">{s.l}</div>
          </div>
        ))}
      </div>

      {blogs.length === 0 ? (
        <div style={{ marginTop: 24 }}>
          <EmptyState
            icon="✍️"
            message="No articles in the library yet."
            action={{ label: '+ Write First Article', fn: () => setAddOpen(true) }}
          />
        </div>
      ) : (
        <div className="blog-grid">
          {blogs.map((b) => {
            const coverImage =
              b.coverImageUrl ||
              `https://placehold.co/800x450/e0f2fe/0369a1?text=${encodeURIComponent(b.title)}`;
            return (
              <div className={`blog-card${!b.isPublished ? ' blog-draft' : ''}`} key={b.id}>
                <div className="blog-card-image-wrap">
                  <img src={coverImage} alt={b.title} className="blog-card-image" />
                  <span className="blog-card-category">{b.category}</span>
                </div>
                <div className="blog-card-body">
                  <h3 className="blog-card-title">{b.title}</h3>
                  <div className="blog-card-meta">
                    <span>By {b.authorName}</span>
                    <span>·</span>
                    <span>{b.readMinutes} min read</span>
                  </div>
                  {b.excerpt && <p className="blog-card-excerpt">{b.excerpt}</p>}
                  
                  <div className="blog-card-status-bar">
                    <span className="status-label">Published status:</span>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={b.isPublished}
                        onChange={() => handlePublishToggle(b.id)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="blog-card-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setEdit(b)}>✏️ Edit</button>
                    <button className="btn btn-secondary btn-sm del-btn" onClick={() => setDel(b)}>🗑 Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {edit && <BlogFormModal blog={edit} onClose={() => setEdit(null)} onSave={handleSave} />}
      {addOpen && <BlogFormModal onClose={() => setAddOpen(false)} onSave={handleSave} />}
      {del && (
        <ConfirmModal
          title="Delete Article?"
          message={`Are you sure you want to delete "${del.title}"? This cannot be undone.`}
          confirmLabel="🗑 Delete"
          danger
          onConfirm={() => handleDel(del.id)}
          onClose={() => setDel(null)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
};

export default Blogs;
