import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Wrench, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function Maintenance() {
  const qc = useQueryClient();
  const { isAssetManager } = useAuth();
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ asset_id: '', description: '', priority: 'medium', image_url: '', imageFile: null });
  const [rejectReason, setRejectReason] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');

  const { data: reqs = [], isLoading } = useQuery({ queryKey: ['maintenance'], queryFn: () => api.get('/maintenance').then(r => r.data) });
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => api.get('/assets').then(r => r.data) });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: d => api.post('/maintenance', d),
    onSuccess: () => { qc.invalidateQueries(['maintenance']); toast.success('Maintenance request raised!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });
  const approve = useMutation({
    mutationFn: id => api.put(`/maintenance/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries(['maintenance']); qc.invalidateQueries(['assets']); toast.success('Approved!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/maintenance/${id}/reject`, { rejection_reason: reason }),
    onSuccess: () => { qc.invalidateQueries(['maintenance']); toast.success('Rejected.'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });
  const resolve = useMutation({
    mutationFn: ({ id, notes }) => api.put(`/maintenance/${id}/resolve`, { technician_notes: notes }),
    onSuccess: () => { qc.invalidateQueries(['maintenance']); qc.invalidateQueries(['assets']); toast.success('Resolved!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const submit = async e => { 
    e.preventDefault(); 
    let finalUrl = form.image_url;
    if (form.imageFile) {
      const fd = new FormData();
      fd.append('file', form.imageFile);
      try {
        const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        finalUrl = res.data.image_url;
      } catch (err) {
        return toast.error("Image upload failed");
      }
    }
    const payload = { ...form, image_url: finalUrl };
    delete payload.imageFile;
    create.mutate(payload); 
  };

  const openAction = (req, action) => { setSelected(req); setModal(action); setRejectReason(''); setResolveNotes(''); };

  return (
    <Layout>
      <div className="page-header">
        <div><h1>Maintenance Management</h1><p>Track and approve asset repair requests</p></div>
        <button className="btn btn-primary" onClick={() => { setForm({ asset_id: '', description: '', priority: 'medium', image_url: '', imageFile: null }); setModal('create'); }}><Plus size={15} />Raise Request</button>
      </div>

      {isLoading ? <div className="loading-page"><div className="spinner spinner-lg" /></div> : reqs.length === 0 ? (
        <EmptyState icon={Wrench} title="No maintenance requests" action={<button className="btn btn-primary" onClick={() => setModal('create')}><Plus size={14} />Raise Request</button>} />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Asset</th><th>Description</th><th>Raised By</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {reqs.map(r => (
                <tr key={r.id}>
                  <td><b>{r.asset_tag}</b><div className="text-muted">{r.asset_name}</div></td>
                  <td style={{ maxWidth: 200 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {r.image_url && <img src={`http://localhost:8000${r.image_url}`} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />}
                      <div>{r.description}</div>
                    </div>
                  </td>
                  <td>{r.raised_by_name}</td>
                  <td><Badge value={r.priority} /></td>
                  <td><Badge value={r.status} /></td>
                  <td>{format(new Date(r.created_at), 'dd MMM yyyy')}</td>
                  <td>
                    {r.status === 'pending' && isAssetManager && (
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => openAction(r, 'approve')}><CheckCircle size={13} /> Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => openAction(r, 'reject')}><XCircle size={13} /> Reject</button>
                      </div>
                    )}
                    {['approved','assigned','in_progress'].includes(r.status) && isAssetManager && (
                      <button className="btn btn-ghost btn-sm" onClick={() => openAction(r, 'resolve')}><CheckCircle size={13} /> Resolve</button>
                    )}
                    {r.resolved_at && <span className="text-muted" style={{ fontSize: 12 }}>Resolved {format(new Date(r.resolved_at), 'dd MMM')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Raise Maintenance Request" onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={create.isPending}>{create.isPending ? <span className="spinner" /> : 'Submit'}</button></>}>
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Asset *</label>
              <select className="form-select" value={form.asset_id} onChange={set('asset_id')} required>
                <option value="">— Select asset —</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_tag} — {a.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Description *</label><textarea className="form-textarea" placeholder="Describe the issue in detail…" value={form.description} onChange={set('description')} required /></div>
            <div className="form-group">
              <label className="form-label">Attach Photo (Optional)</label>
              <input className="form-input" type="file" accept="image/*" onChange={e => setForm(f => ({ ...f, imageFile: e.target.files[0] }))} />
            </div>
          </form>
        </Modal>
      )}

      {modal === 'approve' && selected && (
        <Modal title={`Approve: ${selected.asset_tag}`} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={() => approve.mutate(selected.id)} disabled={approve.isPending}>{approve.isPending ? <span className="spinner" /> : 'Approve'}</button></>}>
          <p style={{ marginBottom: 12 }}>Approve this maintenance request? The asset status will change to <b>Under Maintenance</b>.</p>
          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
            <b>Issue:</b> {selected.description}<br /><b>Priority:</b> {selected.priority}
          </div>
        </Modal>
      )}

      {modal === 'reject' && selected && (
        <Modal title="Reject Request" onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-danger" onClick={() => reject.mutate({ id: selected.id, reason: rejectReason })} disabled={reject.isPending}>{reject.isPending ? <span className="spinner" /> : 'Reject'}</button></>}>
          <div className="form-group"><label className="form-label">Rejection Reason *</label><textarea className="form-textarea" value={rejectReason} onChange={e => setRejectReason(e.target.value)} required /></div>
        </Modal>
      )}

      {modal === 'resolve' && selected && (
        <Modal title={`Resolve: ${selected.asset_tag}`} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={() => resolve.mutate({ id: selected.id, notes: resolveNotes })} disabled={resolve.isPending}>{resolve.isPending ? <span className="spinner" /> : 'Mark Resolved'}</button></>}>
          <p style={{ marginBottom: 12 }}>Resolving will set asset status back to <b>Available</b>.</p>
          <div className="form-group"><label className="form-label">Technician Notes</label><textarea className="form-textarea" placeholder="Work done, parts replaced, etc." value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} /></div>
        </Modal>
      )}
    </Layout>
  );
}
