import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import Layout from '../components/layout/Layout';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Plus, CalendarDays, XCircle, Wand2 } from 'lucide-react';
import { format as fnsFormat } from 'date-fns';

export default function ResourceBooking() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [calAsset, setCalAsset] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({ asset_id: '', title: '', description: '', start_time: '', end_time: '' });
  const [bookingMode, setBookingMode] = useState('custom'); // 'custom' | 'auto'
  const [autoForm, setAutoForm] = useState({ duration: 60, preference: 'day' });

  const { data: bookings = [], isLoading } = useQuery({ queryKey: ['bookings'], queryFn: () => api.get('/bookings').then(r => r.data) });
  const { data: bookableAssets = [] } = useQuery({ queryKey: ['bookable-assets'], queryFn: () => api.get('/assets', { params: { is_bookable: true } }).then(r => r.data) });
  const { data: calendar = [] } = useQuery({
    queryKey: ['calendar', calAsset],
    queryFn: () => api.get(`/bookings/calendar/${calAsset}`).then(r => r.data),
    enabled: !!calAsset,
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: d => api.post('/bookings', d),
    onSuccess: () => { qc.invalidateQueries(['bookings']); toast.success('Booking confirmed!'); setModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Booking failed — check for overlaps'),
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/bookings/${id}/cancel`, { cancellation_reason: reason }),
    onSuccess: () => { qc.invalidateQueries(['bookings']); toast.success('Booking cancelled.'); setCancelModal(null); },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  });

  const suggest = useMutation({
    mutationFn: d => api.post('/bookings/suggest', d).then(r => r.data),
    onSuccess: (data) => {
      toast.success('Found a suitable slot!');
      // Server returns naive UTC. Append 'Z' to parse as UTC in JS.
      const start = new Date(data.start_time + 'Z');
      const end = new Date(data.end_time + 'Z');
      
      const toLocal = d => {
        const pad = n => (n < 10 ? '0' + n : n);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      
      setForm(f => ({ ...f, start_time: toLocal(start), end_time: toLocal(end) }));
      setBookingMode('custom');
    },
    onError: e => toast.error(e.response?.data?.detail || 'Could not find a slot'),
  });

  const submit = e => { e.preventDefault(); create.mutate({ ...form, start_time: new Date(form.start_time).toISOString(), end_time: new Date(form.end_time).toISOString() }); };
  const findSlot = () => suggest.mutate({ asset_id: form.asset_id, duration_minutes: parseInt(autoForm.duration), preference: autoForm.preference });

  return (
    <Layout>
      <div className="page-header">
        <div><h1>Resource Bookings</h1><p>Book shared resources by time slot with overlap protection</p></div>
        <button className="btn btn-primary" onClick={() => setModal('create')}><Plus size={15} />New Booking</button>
      </div>

      {/* Calendar quick-check */}
      <div className="card mb-4">
        <div className="card-header"><h3>Resource Availability</h3></div>
        <div className="card-body">
          <div className="flex gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-select" style={{ width: 260 }} value={calAsset} onChange={e => setCalAsset(e.target.value)}>
              <option value="">Select a bookable resource to see bookings</option>
              {bookableAssets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>)}
            </select>
          </div>
          {calAsset && calendar.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {calendar.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <CalendarDays size={14} style={{ color: 'var(--text-3)' }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{fnsFormat(new Date(b.start), 'dd MMM, HH:mm')} → {fnsFormat(new Date(b.end), 'HH:mm')}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{b.booked_by}</span>
                  <Badge value={b.status} />
                </div>
              ))}
            </div>
          )}
          {calAsset && calendar.length === 0 && <p style={{ marginTop: 12, color: 'var(--text-3)', fontSize: 13 }}>No active bookings for this resource.</p>}
        </div>
      </div>

      {isLoading ? <div className="loading-page"><div className="spinner spinner-lg" /></div> : bookings.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No bookings yet" action={<button className="btn btn-primary" onClick={() => setModal('create')}><Plus size={14} />Book a Resource</button>} />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Resource</th><th>Title</th><th>Booked By</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td><b>{b.asset_tag}</b><div className="text-muted">{b.asset_name}</div></td>
                  <td>{b.title}</td>
                  <td>{b.booked_by_name}</td>
                  <td>{fnsFormat(new Date(b.start_time), 'dd MMM HH:mm')}</td>
                  <td>{fnsFormat(new Date(b.end_time), 'dd MMM HH:mm')}</td>
                  <td><Badge value={b.status} /></td>
                  <td>
                    {(b.status === 'upcoming' || b.status === 'ongoing') && (
                      <button className="btn btn-ghost btn-sm" onClick={() => { setCancelModal(b); setCancelReason(''); }}><XCircle size={13} /> Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Book Resource" onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={create.isPending || !form.start_time}>{create.isPending ? <span className="spinner" /> : 'Confirm Booking'}</button></>}>
          <div style={{ background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12.5, color: 'var(--text-3)' }}>
            ℹ️ Bookings are rejected if they overlap with existing confirmed bookings.
          </div>
          
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className={`btn btn-sm ${bookingMode === 'custom' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setBookingMode('custom')}>Custom Slot</button>
            <button className={`btn btn-sm ${bookingMode === 'auto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setBookingMode('auto')}><Wand2 size={13} /> Auto Suggest Slot</button>
          </div>

          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Resource *</label>
              <select className="form-select" value={form.asset_id} onChange={set('asset_id')} required>
                <option value="">— Select bookable resource —</option>
                {bookableAssets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Booking Title *</label><input className="form-input" placeholder="e.g. Team standup" value={form.title} onChange={set('title')} required /></div>
            
            {bookingMode === 'auto' ? (
              <div style={{ background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Let the algorithm decide</h4>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Duration (Minutes)</label>
                    <input className="form-input" type="number" step="15" value={autoForm.duration} onChange={e => setAutoForm(f => ({...f, duration: e.target.value}))} />
                  </div>
                  <div className="form-group"><label className="form-label">Time Preference</label>
                    <select className="form-select" value={autoForm.preference} onChange={e => setAutoForm(f => ({...f, preference: e.target.value}))}>
                      <option value="day">Day time (08:00 - 18:00)</option>
                      <option value="night">Night time (18:00 - 08:00)</option>
                      <option value="next_day">Whole next day</option>
                    </select>
                  </div>
                </div>
                <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={findSlot} disabled={!form.asset_id || suggest.isPending}>
                  {suggest.isPending ? <span className="spinner" /> : <><Wand2 size={15}/> Find Next Available Slot</>}
                </button>
                {!form.asset_id && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>Please select a resource first</div>}
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group"><label className="form-label">Start Time *</label><input className="form-input" type="datetime-local" value={form.start_time} onChange={set('start_time')} required /></div>
                <div className="form-group"><label className="form-label">End Time *</label><input className="form-input" type="datetime-local" value={form.end_time} onChange={set('end_time')} required /></div>
              </div>
            )}
            
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={set('description')} /></div>
          </form>
        </Modal>
      )}

      {cancelModal && (
        <Modal title="Cancel Booking" onClose={() => setCancelModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setCancelModal(null)}>Keep Booking</button><button className="btn btn-danger" onClick={() => cancel.mutate({ id: cancelModal.id, reason: cancelReason })} disabled={cancel.isPending}>{cancel.isPending ? <span className="spinner" /> : 'Cancel Booking'}</button></>}>
          <div className="form-group"><label className="form-label">Reason (optional)</label><textarea className="form-textarea" value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></div>
        </Modal>
      )}
    </Layout>
  );
}
