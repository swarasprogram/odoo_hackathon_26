import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications').then(r => r.data) });
  const { data: logs = [] } = useQuery({ queryKey: ['activity-logs'], queryFn: () => api.get('/activity-logs').then(r => r.data) });

  const markRead = useMutation({
    mutationFn: id => api.put(`/notifications/${id}/read`),
    onSuccess: () => { qc.invalidateQueries(['notifications']); qc.invalidateQueries(['notif-count']); },
  });
  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => { qc.invalidateQueries(['notifications']); qc.invalidateQueries(['notif-count']); toast.success('All marked as read'); },
  });

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <Layout>
      <div className="page-header">
        <div><h1>Notifications</h1><p>{unread} unread notifications</p></div>
        {unread > 0 && <button className="btn btn-secondary" onClick={() => markAll.mutate()}><CheckCheck size={15} />Mark All Read</button>}
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Notifications */}
        <div>
          <h3 style={{ marginBottom: 14 }}>Inbox</h3>
          {isLoading ? <div className="loading-page"><div className="spinner" /></div> : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="All caught up!" description="No notifications yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.map(n => (
                <div key={n.id}
                  className="card"
                  style={{ padding: '14px 16px', cursor: 'pointer', borderLeft: !n.is_read ? '3px solid var(--black)' : '3px solid transparent', opacity: n.is_read ? 0.65 : 1, transition: 'all 0.15s' }}
                  onClick={() => !n.is_read && markRead.mutate(n.id)}>
                  <div className="flex-between">
                    <span style={{ fontSize: 13.5, fontWeight: n.is_read ? 400 : 600 }}>{n.title}</span>
                    <span className="text-muted">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                  </div>
                  <p style={{ fontSize: 13, marginTop: 4 }}>{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div>
          <h3 style={{ marginBottom: 14 }}>Activity Log</h3>
          <div className="card">
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {logs.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No activity yet</div> : (
                <ul className="timeline" style={{ padding: '16px 20px' }}>
                  {logs.map(log => (
                    <li key={log.id} className="timeline-item">
                      <div className="timeline-dot">
                        <span style={{ width: 8, height: 8, background: 'var(--gray-400)', borderRadius: '50%', display: 'block' }} />
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-title">
                          <b>{log.user_name || 'System'}</b> — {log.action}
                        </div>
                        <div className="timeline-meta">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          {log.entity_type && <span> · {log.entity_type}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
