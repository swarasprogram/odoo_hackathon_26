import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Building2, Tag, Users, Edit, ToggleLeft } from 'lucide-react';

// ─── Department Tab ───────────────────────────────────────
function DepartmentsTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'create' | dept-object
  const [form, setForm] = useState({ name: '', description: '', head_id: '', parent_id: '', is_active: true });
  const { data: depts = [], isLoading } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: (data) => modal?.id ? api.put(`/departments/${modal.id}`, data) : api.post('/departments', data),
    onSuccess: () => { qc.invalidateQueries(['departments']); toast.success('Saved!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const openEdit = (d) => { setForm({ name: d.name, description: d.description || '', head_id: d.head_id || '', parent_id: d.parent_id || '', is_active: d.is_active }); setModal(d); };
  const openCreate = () => { setForm({ name: '', description: '', head_id: '', parent_id: '', is_active: true }); setModal('create'); };

  const submit = (e) => { e.preventDefault(); save.mutate({ ...form, head_id: form.head_id || null, parent_id: form.parent_id || null }); };

  return (
    <>
      <div className="flex-between mb-4">
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{depts.length} departments</span>
        <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} />New Department</button>
      </div>
      {isLoading ? <div className="loading-page"><div className="spinner" /></div> : depts.length === 0 ? (
        <EmptyState icon={Building2} title="No departments yet" action={<button className="btn btn-primary" onClick={openCreate}><Plus size={14} />Create First Department</button>} />
      ) : (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Name</th><th>Head</th><th>Employees</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {depts.map(d => (
                <tr key={d.id}>
                  <td><b>{d.name}</b>{d.description && <div className="text-muted">{d.description}</div>}</td>
                  <td>{d.head_name || <span className="text-muted">—</span>}</td>
                  <td>{d.employee_count}</td>
                  <td><Badge value={d.is_active ? 'active' : 'inactive'} /></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}><Edit size={13} /> Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'New Department' : 'Edit Department'} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={save.isPending}>{save.isPending ? <span className="spinner" /> : 'Save'}</button></>}>
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={set('name')} required /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={set('description')} /></div>
            <div className="form-group"><label className="form-label">Department Head</label>
              <select className="form-select" value={form.head_id} onChange={set('head_id')}>
                <option value="">— None —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Parent Department</label>
              <select className="form-select" value={form.parent_id} onChange={set('parent_id')}>
                <option value="">— Top level —</option>
                {depts.filter(d => d.id !== modal?.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <span className="form-label" style={{ margin: 0 }}>Active</span>
            </label></div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Categories Tab ───────────────────────────────────────
function CategoriesTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', warranty_period_months: '' });
  const { data: cats = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: d => modal?.id ? api.put(`/categories/${modal.id}`, d) : api.post('/categories', d),
    onSuccess: () => { qc.invalidateQueries(['categories']); toast.success('Saved!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const openEdit = c => { setForm({ name: c.name, description: c.description || '', warranty_period_months: c.warranty_period_months || '' }); setModal(c); };
  const openCreate = () => { setForm({ name: '', description: '', warranty_period_months: '' }); setModal('create'); };
  const submit = e => { e.preventDefault(); save.mutate(form); };

  return (
    <>
      <div className="flex-between mb-4">
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{cats.length} categories</span>
        <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} />New Category</button>
      </div>
      {isLoading ? <div className="loading-page"><div className="spinner" /></div> : cats.length === 0 ? (
        <EmptyState icon={Tag} title="No categories yet" action={<button className="btn btn-primary" onClick={openCreate}><Plus size={14} />Create Category</button>} />
      ) : (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Name</th><th>Description</th><th>Warranty</th><th>Assets</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {cats.map(c => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.description || <span className="text-muted">—</span>}</td>
                  <td>{c.warranty_period_months ? `${c.warranty_period_months} months` : '—'}</td>
                  <td>{c.asset_count}</td>
                  <td><Badge value={c.is_active ? 'active' : 'inactive'} /></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Edit size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'New Category' : 'Edit Category'} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={save.isPending}>{save.isPending ? <span className="spinner" /> : 'Save'}</button></>}>
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={set('name')} required /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={set('description')} /></div>
            <div className="form-group"><label className="form-label">Warranty Period (months)</label><input className="form-input" type="number" placeholder="e.g. 24" value={form.warranty_period_months} onChange={set('warranty_period_months')} /></div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Employees Tab ───────────────────────────────────────
function EmployeesTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ role: 'employee', status: 'active', department_id: '' });
  const { data: employees = [], isLoading } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data) });

  const update = useMutation({
    mutationFn: ({ id, data }) => api.put(`/employees/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Updated!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const openEdit = emp => { setForm({ role: emp.role, status: emp.status, department_id: emp.department_id || '' }); setModal(emp); };

  return (
    <>
      <div className="flex-between mb-4">
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{employees.length} employees</span>
      </div>
      {isLoading ? <div className="loading-page"><div className="spinner" /></div> : (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td><b>{emp.name}</b></td>
                  <td style={{ color: 'var(--text-2)' }}>{emp.email}</td>
                  <td>{emp.department_id ? depts.find(d => d.id === emp.department_id)?.name : <span className="text-muted">—</span>}</td>
                  <td><Badge value={emp.role} /></td>
                  <td><Badge value={emp.status} /></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(emp)}><Edit size={13} /> Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={`Manage: ${modal.name}`} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={() => update.mutate({ id: modal.id, data: { ...form, department_id: form.department_id || null } })} disabled={update.isPending}>{update.isPending ? <span className="spinner" /> : 'Update'}</button></>}>
          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12.5, color: 'var(--text-3)' }}>
            ⚠️ Role changes take effect immediately.
          </div>
          <div className="form-group"><label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="employee">Employee</option>
              <option value="department_head">Department Head</option>
              <option value="asset_manager">Asset Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Department</label>
            <select className="form-select" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
              <option value="">— None —</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────
export default function OrgSetup() {
  const [tab, setTab] = useState('departments');
  return (
    <Layout>
      <div className="page-header">
        <div><h1>Organization Setup</h1><p>Manage departments, asset categories, and employee directory</p></div>
      </div>
      <div className="tabs">
        <button className={`tab ${tab === 'departments' ? 'active' : ''}`} onClick={() => setTab('departments')}><Building2 size={14} style={{ display: 'inline', marginRight: 6 }} />Departments</button>
        <button className={`tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}><Tag size={14} style={{ display: 'inline', marginRight: 6 }} />Asset Categories</button>
        <button className={`tab ${tab === 'employees' ? 'active' : ''}`} onClick={() => setTab('employees')}><Users size={14} style={{ display: 'inline', marginRight: 6 }} />Employee Directory</button>
      </div>
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'employees' && <EmployeesTab />}
    </Layout>
  );
}
