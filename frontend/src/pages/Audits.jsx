import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, ClipboardCheck, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const ITEM_STATUSES = ['verified', 'missing', 'damaged'];

export default function Audits() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', scope_type: 'all', scope_department_id: '', scope_location: '', start_date: '', end_date: '', auditor_ids: [], notes: '' });

  const { data: cycles = [], isLoading } = useQuery({ queryKey: ['audits'], queryFn: () => api.get('/audits').then(r => r.data) });
  const { data: items = [] } = useQuery({
    queryKey: ['audit-items', selected?.id],
    queryFn: () => api.get(`/audits/${selected.id}/items`).then(r => r.data),
    enabled: modal === 'view' && !!selected?.id,
  });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: d => api.post('/audits', d),
    onSuccess: () => { qc.invalidateQueries(['audits']); toast.success('Audit cycle created!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const updateItem = useMutation({
    mutationFn: ({ cycleId, itemId, data }) => api.put(`/audits/${cycleId}/items/${itemId}`, data),
    onSuccess: () => { qc.invalidateQueries(['audit-items', selected?.id]); toast.success('Updated!'); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const closeAudit = useMutation({
    mutationFn: id => api.post(`/audits/${id}/close`),
    onSuccess: () => { qc.invalidateQueries(['audits']); toast.success('Audit cycle closed. Missing assets flagged as Lost.'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const submit = e => { e.preventDefault(); create.mutate({ ...form, scope_department_id: form.scope_department_id || null, start_date: new Date(form.start_date).toISOString(), end_date: new Date(form.end_date).toISOString() }); };

  const toggleAuditor = (id) => {
    setForm(f => ({ ...f, auditor_ids: f.auditor_ids.includes(id) ? f.auditor_ids.filter(x => x !== id) : [...f.auditor_ids, id] }));
  };

  const statusIcon = s => s === 'verified' ? <CheckCircle size={14} style={{ color: '#1a6b3c' }} /> : s === 'missing' ? <AlertTriangle size={14} style={{ color: '#8b1a1a' }} /> : s === 'damaged' ? <XCircle size={14} style={{ color: '#7a4d00' }} /> : null;

  return (
    <Layout>
      <div className="page-header">
        <div><h1>Asset Audits</h1><p>Run structured verification cycles and generate discrepancy reports</p></div>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', scope_type: 'all', scope_department_id: '', scope_location: '', start_date: '', end_date: '', auditor_ids: [], notes: '' }); setModal('create'); }}><Plus size={15} />New Audit Cycle</button>
      </div>

      {isLoading ? <div className="loading-page"><div className="spinner spinner-lg" /></div> : cycles.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No audit cycles" description="Create your first audit cycle to verify assets" action={<button className="btn btn-primary" onClick={() => setModal('create')}><Plus size={14} />New Cycle</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cycles.map(c => (
            <div key={c.id} className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{format(new Date(c.start_date), 'dd MMM')} → {format(new Date(c.end_date), 'dd MMM yyyy')} · Scope: {c.scope_type}</div>
                  {c.auditor_names?.length > 0 && <div className="text-muted" style={{ fontSize: 12 }}>Auditors: {c.auditor_names.join(', ')}</div>}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <span><b>{c.total_items}</b> total</span>
                  <span style={{ color: '#1a6b3c' }}><b>{c.verified_count}</b> verified</span>
                  <span style={{ color: '#8b1a1a' }}><b>{c.missing_count}</b> missing</span>
                  <span style={{ color: '#7a4d00' }}><b>{c.damaged_count}</b> damaged</span>
                </div>
                <Badge value={c.status} />
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(c); setModal('view'); }}>View Items</button>
                  {c.status === 'active' && (
                    <button className="btn btn-danger btn-sm" onClick={() => closeAudit.mutate(c.id)}>Close Cycle</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {modal === 'create' && (
        <Modal title="New Audit Cycle" onClose={() => setModal(null)} size="lg"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={create.isPending}>{create.isPending ? <span className="spinner" /> : 'Create Cycle'}</button></>}>
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Cycle Name *</label><input className="form-input" placeholder="e.g. Q3 2026 Asset Audit" value={form.name} onChange={set('name')} required /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Start Date *</label><input className="form-input" type="date" value={form.start_date} onChange={set('start_date')} required /></div>
              <div className="form-group"><label className="form-label">End Date *</label><input className="form-input" type="date" value={form.end_date} onChange={set('end_date')} required /></div>
            </div>
            <div className="form-group"><label className="form-label">Scope</label>
              <select className="form-select" value={form.scope_type} onChange={set('scope_type')}>
                <option value="all">All Assets</option>
                <option value="department">By Department</option>
                <option value="location">By Location</option>
              </select>
            </div>
            {form.scope_type === 'department' && (
              <div className="form-group"><label className="form-label">Department</label>
                <select className="form-select" value={form.scope_department_id} onChange={set('scope_department_id')}>
                  <option value="">— Select —</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {form.scope_type === 'location' && (
              <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={form.scope_location} onChange={set('scope_location')} /></div>
            )}
            <div className="form-group">
              <label className="form-label">Assign Auditors</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--border)' }}>
                {employees.map(emp => (
                  <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, padding: '4px 8px', borderRadius: 6, background: form.auditor_ids.includes(emp.id) ? 'var(--black)' : 'var(--white)', color: form.auditor_ids.includes(emp.id) ? 'var(--white)' : 'var(--text)', border: '1px solid var(--border)', transition: 'all 0.15s' }}>
                    <input type="checkbox" style={{ display: 'none' }} checked={form.auditor_ids.includes(emp.id)} onChange={() => toggleAuditor(emp.id)} />
                    {emp.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={set('notes')} /></div>
          </form>
        </Modal>
      )}

      {/* View Items Modal */}
      {modal === 'view' && selected && (
        <Modal title={`Audit Items — ${selected.name}`} onClose={() => setModal(null)} size="lg">
          {items.length === 0 ? <EmptyState icon={ClipboardCheck} title="No items in this cycle" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Asset</th><th>Tag</th><th>Location</th><th>Status</th><th>Notes</th><th>Action</th></tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>{item.asset_name}</td>
                      <td><span className="chip">{item.asset_tag}</span></td>
                      <td>{item.asset_location || '—'}</td>
                      <td><div className="flex-center gap-2">{statusIcon(item.status)}<Badge value={item.status} /></div></td>
                      <td style={{ maxWidth: 120, fontSize: 12, color: 'var(--text-3)' }}>{item.notes || '—'}</td>
                      <td>
                        {selected.status === 'active' && (
                          <select className="form-select" style={{ width: 120, fontSize: 12, padding: '4px 8px' }}
                            value={item.status}
                            onChange={e => updateItem.mutate({ cycleId: selected.id, itemId: item.id, data: { status: e.target.value, notes: item.notes } })}>
                            <option value="pending">Pending</option>
                            {ITEM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </Layout>
  );
}
