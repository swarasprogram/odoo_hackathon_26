import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Search, Package, Eye, Edit, History } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['available','allocated','reserved','under_maintenance','lost','retired','disposed'];
const CONDITIONS = ['excellent','good','fair','poor','damaged'];

export default function AssetDirectory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'history'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', serial_number: '', category_id: '', department_id: '', acquisition_date: '', acquisition_cost: '', condition: 'good', location: '', description: '', is_bookable: false });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', search, filterStatus, filterCat],
    queryFn: () => api.get('/assets', { params: { search: search || undefined, status: filterStatus || undefined, category_id: filterCat || undefined } }).then(r => r.data),
  });
  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });
  const { data: history } = useQuery({
    queryKey: ['asset-history', selected?.id],
    queryFn: () => api.get(`/assets/${selected?.id}/history`).then(r => r.data),
    enabled: modal === 'history' && !!selected?.id,
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: d => modal === 'edit' ? api.put(`/assets/${selected.id}`, d) : api.post('/assets', d),
    onSuccess: () => { qc.invalidateQueries(['assets']); toast.success('Asset saved!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const openCreate = () => { setForm({ name: '', serial_number: '', category_id: '', department_id: '', acquisition_date: '', acquisition_cost: '', condition: 'good', location: '', description: '', is_bookable: false }); setModal('create'); };
  const openEdit = a => { setSelected(a); setForm({ name: a.name, serial_number: a.serial_number || '', category_id: a.category_id, department_id: a.department_id || '', acquisition_date: a.acquisition_date ? a.acquisition_date.slice(0,10) : '', acquisition_cost: a.acquisition_cost || '', condition: a.condition, location: a.location || '', description: a.description || '', is_bookable: a.is_bookable }); setModal('edit'); };
  const openHistory = a => { setSelected(a); setModal('history'); };
  const submit = e => { e.preventDefault(); save.mutate({ ...form, category_id: form.category_id || undefined, department_id: form.department_id || null, acquisition_date: form.acquisition_date || null, acquisition_cost: form.acquisition_cost || null }); };

  return (
    <Layout>
      <div className="page-header">
        <div><h1>Asset Directory</h1><p>Register and track all organizational assets</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} />Register Asset</button>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <div className="search-icon"><Search /></div>
          <input className="form-input search-input" placeholder="Search by name, tag, serial…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
        <select className="form-select" style={{ width: 160 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? <div className="loading-page"><div className="spinner spinner-lg" /></div> : assets.length === 0 ? (
        <EmptyState icon={Package} title="No assets found" description="Register your first asset to get started" action={<button className="btn btn-primary" onClick={openCreate}><Plus size={14} />Register Asset</button>} />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Tag</th><th>Name</th><th>Category</th><th>Status</th><th>Condition</th><th>Location</th><th>Holder</th><th>Actions</th></tr></thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id}>
                  <td><span className="chip">{a.asset_tag}</span></td>
                  <td><b>{a.name}</b>{a.serial_number && <div className="text-muted">S/N: {a.serial_number}</div>}</td>
                  <td>{a.category_name}</td>
                  <td><Badge value={a.status} /></td>
                  <td><Badge value={a.condition} /></td>
                  <td>{a.location || '—'}</td>
                  <td>{a.current_holder || <span className="text-muted">—</span>}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(a)}><Edit size={13} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="History" onClick={() => openHistory(a)}><History size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Register Asset' : `Edit ${selected?.asset_tag}`} onClose={() => setModal(null)} size="lg"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={save.isPending}>{save.isPending ? <span className="spinner" /> : 'Save'}</button></>}>
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={set('name')} required /></div>
              <div className="form-group"><label className="form-label">Serial Number</label><input className="form-input" value={form.serial_number} onChange={set('serial_number')} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Category *</label>
                <select className="form-select" value={form.category_id} onChange={set('category_id')} required>
                  <option value="">— Select —</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Department</label>
                <select className="form-select" value={form.department_id} onChange={set('department_id')}>
                  <option value="">— None —</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Acquisition Date</label><input className="form-input" type="date" value={form.acquisition_date} onChange={set('acquisition_date')} /></div>
              <div className="form-group"><label className="form-label">Acquisition Cost</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.acquisition_cost} onChange={set('acquisition_cost')} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Condition</label>
                <select className="form-select" value={form.condition} onChange={set('condition')}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Location</label><input className="form-input" placeholder="e.g. Floor 2, Room B2" value={form.location} onChange={set('location')} /></div>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={set('description')} /></div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.is_bookable} onChange={e => setForm(f => ({ ...f, is_bookable: e.target.checked }))} />
              <span>Mark as shared/bookable resource</span>
            </label>
          </form>
        </Modal>
      )}

      {/* History Modal */}
      {modal === 'history' && selected && (
        <Modal title={`History — ${selected.asset_tag}`} onClose={() => setModal(null)} size="lg">
          {!history ? <div className="loading-page"><div className="spinner" /></div> : (
            <>
              <h4 style={{ marginBottom: 12 }}>Allocation History</h4>
              {history.allocations.length === 0 ? <p className="text-muted">No allocation history</p> : (
                <ul className="timeline">
                  {history.allocations.map(a => (
                    <li key={a.id} className="timeline-item">
                      <div className="timeline-dot"><Package size={13} /></div>
                      <div className="timeline-content">
                        <div className="timeline-title">{a.employee || a.department || 'Unknown'}</div>
                        <div className="timeline-meta">{format(new Date(a.allocated_at), 'dd MMM yyyy')} → {a.returned_at ? format(new Date(a.returned_at), 'dd MMM yyyy') : 'Present'} · <Badge value={a.status} /></div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="divider" />
              <h4 style={{ marginBottom: 12 }}>Maintenance History</h4>
              {history.maintenance.length === 0 ? <p className="text-muted">No maintenance history</p> : (
                <ul className="timeline">
                  {history.maintenance.map(m => (
                    <li key={m.id} className="timeline-item">
                      <div className="timeline-dot"><Edit size={13} /></div>
                      <div className="timeline-content">
                        <div className="timeline-title">{m.description}</div>
                        <div className="timeline-meta">{format(new Date(m.created_at), 'dd MMM yyyy')} · <Badge value={m.priority} /> · <Badge value={m.status} /></div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Modal>
      )}
    </Layout>
  );
}
