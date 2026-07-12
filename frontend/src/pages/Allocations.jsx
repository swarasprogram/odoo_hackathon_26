import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, ArrowLeftRight, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

function AllocationsTab() {
  const qc = useQueryClient();
  const { isAssetManager } = useAuth();
  const [modal, setModal] = useState(null);
  const [returnModal, setReturnModal] = useState(null);
  const [form, setForm] = useState({ asset_id: '', employee_id: '', department_id: '', expected_return_date: '', notes: '' });
  const [returnNotes, setReturnNotes] = useState('');

  const { data: allocs = [], isLoading } = useQuery({ queryKey: ['allocations'], queryFn: () => api.get('/allocations').then(r => r.data) });
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => api.get('/assets').then(r => r.data) });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const allocate = useMutation({
    mutationFn: d => api.post('/allocations', d),
    onSuccess: () => { qc.invalidateQueries(['allocations']); qc.invalidateQueries(['assets']); toast.success('Asset allocated!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const returnAsset = useMutation({
    mutationFn: ({ id, notes }) => api.put(`/allocations/${id}/return`, { condition_check_in_notes: notes }),
    onSuccess: () => { qc.invalidateQueries(['allocations']); qc.invalidateQueries(['assets']); toast.success('Asset returned!'); setReturnModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const submit = e => { e.preventDefault(); allocate.mutate({ ...form, employee_id: form.employee_id || null, department_id: form.department_id || null, expected_return_date: form.expected_return_date || null }); };

  const availableAssets = assets.filter(a => a.status === 'available');

  return (
    <>
      <div className="flex-between mb-4">
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{allocs.length} records</span>
        {isAssetManager && <button className="btn btn-primary btn-sm" onClick={() => setModal('create')}><Plus size={14} />Allocate Asset</button>}
      </div>

      {isLoading ? <div className="loading-page"><div className="spinner" /></div> : allocs.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No allocations" />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Asset</th><th>Holder</th><th>Department</th><th>Allocated</th><th>Return Due</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {allocs.map(a => (
                <tr key={a.id}>
                  <td><b>{a.asset_tag}</b><div className="text-muted">{a.asset_name}</div></td>
                  <td>{a.employee_name || '—'}</td>
                  <td>{a.department_name || '—'}</td>
                  <td>{format(new Date(a.allocated_at), 'dd MMM yyyy')}</td>
                  <td style={{ color: a.status === 'overdue' ? '#8b1a1a' : 'inherit' }}>
                    {a.expected_return_date ? format(new Date(a.expected_return_date), 'dd MMM yyyy') : '—'}
                  </td>
                  <td><Badge value={a.status} /></td>
                  <td>
                    {a.status === 'active' || a.status === 'overdue' ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => { setReturnModal(a); setReturnNotes(''); }}>
                        <CheckCircle size={13} /> Return
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Allocate Asset" onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={allocate.isPending}>{allocate.isPending ? <span className="spinner" /> : 'Allocate'}</button></>}>
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Asset *</label>
              <select className="form-select" value={form.asset_id} onChange={set('asset_id')} required>
                <option value="">— Select available asset —</option>
                {availableAssets.map(a => <option key={a.id} value={a.id}>{a.asset_tag} — {a.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Employee</label>
              <select className="form-select" value={form.employee_id} onChange={set('employee_id')}>
                <option value="">— Select employee —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Or Department</label>
              <select className="form-select" value={form.department_id} onChange={set('department_id')}>
                <option value="">— Select department —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Expected Return Date</label>
              <input className="form-input" type="date" value={form.expected_return_date} onChange={set('expected_return_date')} />
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={set('notes')} /></div>
          </form>
        </Modal>
      )}

      {returnModal && (
        <Modal title={`Return ${returnModal.asset_tag}`} onClose={() => setReturnModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setReturnModal(null)}>Cancel</button><button className="btn btn-primary" onClick={() => returnAsset.mutate({ id: returnModal.id, notes: returnNotes })} disabled={returnAsset.isPending}>{returnAsset.isPending ? <span className="spinner" /> : 'Confirm Return'}</button></>}>
          <div className="form-group">
            <label className="form-label">Condition Check-in Notes</label>
            <textarea className="form-textarea" placeholder="Describe the condition on return…" value={returnNotes} onChange={e => setReturnNotes(e.target.value)} />
          </div>
        </Modal>
      )}
    </>
  );
}

function TransfersTab() {
  const qc = useQueryClient();
  const { isAssetManager } = useAuth();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ asset_id: '', to_user_id: '', to_department_id: '', notes: '' });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: transfers = [], isLoading } = useQuery({ queryKey: ['transfers'], queryFn: () => api.get('/transfers').then(r => r.data) });
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => api.get('/assets').then(r => r.data) });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: d => api.post('/transfers', d),
    onSuccess: () => { qc.invalidateQueries(['transfers']); toast.success('Transfer requested!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });
  const approve = useMutation({
    mutationFn: id => api.put(`/transfers/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries(['transfers']); qc.invalidateQueries(['assets']); toast.success('Transfer approved!'); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/transfers/${id}/reject`, { rejection_reason: reason }),
    onSuccess: () => { qc.invalidateQueries(['transfers']); toast.success('Transfer rejected.'); setRejectModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const submit = e => { e.preventDefault(); create.mutate({ ...form, to_user_id: form.to_user_id || null, to_department_id: form.to_department_id || null }); };

  return (
    <>
      <div className="flex-between mb-4">
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{transfers.length} requests</span>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('create')}><Plus size={14} />Request Transfer</button>
      </div>

      {isLoading ? <div className="loading-page"><div className="spinner" /></div> : transfers.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No transfer requests" />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Asset</th><th>From</th><th>To</th><th>Requested By</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id}>
                  <td><b>{t.asset_tag}</b><div className="text-muted">{t.asset_name}</div></td>
                  <td>{t.from_user_name || '—'}</td>
                  <td>{t.to_user_name || t.to_department_name || '—'}</td>
                  <td>{t.requested_by_name}</td>
                  <td><Badge value={t.status} /></td>
                  <td>
                    {t.status === 'pending' && isAssetManager && (
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => approve.mutate(t.id)}><CheckCircle size={13} /> Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setRejectModal(t); setRejectReason(''); }}><XCircle size={13} /> Reject</button>
                      </div>
                    )}
                    {t.rejection_reason && <span className="text-muted" style={{ fontSize: 12 }}>{t.rejection_reason}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Request Transfer" onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={create.isPending}>{create.isPending ? <span className="spinner" /> : 'Submit'}</button></>}>
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Asset *</label>
              <select className="form-select" value={form.asset_id} onChange={set('asset_id')} required>
                <option value="">— Select asset —</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_tag} — {a.name} ({a.status})</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Transfer To Employee</label>
              <select className="form-select" value={form.to_user_id} onChange={set('to_user_id')}>
                <option value="">— Select employee —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Or Transfer To Department</label>
              <select className="form-select" value={form.to_department_id} onChange={set('to_department_id')}>
                <option value="">— Select department —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={set('notes')} /></div>
          </form>
        </Modal>
      )}

      {rejectModal && (
        <Modal title="Reject Transfer" onClose={() => setRejectModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button><button className="btn btn-danger" onClick={() => reject.mutate({ id: rejectModal.id, reason: rejectReason })} disabled={reject.isPending}>{reject.isPending ? <span className="spinner" /> : 'Reject'}</button></>}>
          <div className="form-group"><label className="form-label">Rejection Reason *</label><textarea className="form-textarea" value={rejectReason} onChange={e => setRejectReason(e.target.value)} required /></div>
        </Modal>
      )}
    </>
  );
}

export default function Allocations() {
  const [tab, setTab] = useState('allocations');
  return (
    <Layout>
      <div className="page-header"><div><h1>Allocations & Transfers</h1><p>Manage asset assignments and transfer requests</p></div></div>
      <div className="tabs">
        <button className={`tab ${tab === 'allocations' ? 'active' : ''}`} onClick={() => setTab('allocations')}>Allocations</button>
        <button className={`tab ${tab === 'transfers' ? 'active' : ''}`} onClick={() => setTab('transfers')}>Transfer Requests</button>
      </div>
      {tab === 'allocations' ? <AllocationsTab /> : <TransfersTab />}
    </Layout>
  );
}
