import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { Package, CheckCircle, Wrench, CalendarDays, ArrowLeftRight, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

function KPICard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className={`kpi-card ${accent ? 'accent' : ''}`}>
      <div className="kpi-icon"><Icon size={18} /></div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value ?? '—'}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: overdueList = [] } = useQuery({
    queryKey: ['overdue'],
    queryFn: () => api.get('/allocations/overdue').then(r => r.data),
  });

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Organization-wide asset overview</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => navigate('/assets')}>Register Asset</button>
          <button className="btn btn-secondary" onClick={() => navigate('/bookings')}>Book Resource</button>
          <button className="btn btn-secondary" onClick={() => navigate('/maintenance')}>Raise Maintenance</button>
        </div>
      </div>

      {isLoading ? <div className="loading-page"><div className="spinner spinner-lg" /></div> : (
        <>
          <div className="kpi-grid">
            <KPICard label="Total Assets" value={stats?.total_assets} icon={Package} accent />
            <KPICard label="Available" value={stats?.available} sub="ready to allocate" icon={CheckCircle} />
            <KPICard label="Allocated" value={stats?.allocated} sub="currently in use" icon={TrendingUp} />
            <KPICard label="Under Maintenance" value={stats?.under_maintenance} icon={Wrench} />
            <KPICard label="Active Bookings" value={stats?.active_bookings} icon={CalendarDays} />
            <KPICard label="Pending Maintenance" value={stats?.pending_maintenance} icon={Wrench} />
            <KPICard label="Overdue Returns" value={stats?.overdue_returns} sub="past return date" icon={AlertTriangle} />
            <KPICard label="Upcoming Returns" value={stats?.upcoming_returns} sub="next 7 days" icon={Clock} />
          </div>

          {overdueList.length > 0 && (
            <div className="card mb-4">
              <div className="card-header">
                <h3 style={{ color: '#8b1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} /> Overdue Returns ({overdueList.length})
                </h3>
                <button className="btn btn-sm btn-secondary" onClick={() => navigate('/allocations')}>View All</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Asset</th><th>Holder</th><th>Department</th><th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueList.slice(0, 5).map(a => (
                      <tr key={a.id}>
                        <td><b>{a.asset_tag}</b> — {a.asset_name}</td>
                        <td>{a.employee_name || '—'}</td>
                        <td>{a.department_name || '—'}</td>
                        <td style={{ color: '#8b1a1a' }}>{new Date(a.expected_return_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="card">
              <div className="card-header"><h3>Quick Actions</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Register new asset', to: '/assets', icon: Package },
                  { label: 'Allocate an asset', to: '/allocations', icon: ArrowLeftRight },
                  { label: 'Book a resource', to: '/bookings', icon: CalendarDays },
                  { label: 'Request maintenance', to: '/maintenance', icon: Wrench },
                  { label: 'View reports', to: '/reports', icon: TrendingUp },
                ].map(({ label, to, icon: Icon }) => (
                  <button key={to} className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }} onClick={() => navigate(to)}>
                    <Icon size={15} />{label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>Asset Status Summary</h3></div>
              <div className="card-body">
                {[
                  { label: 'Available', count: stats?.available, total: stats?.total_assets, color: '#1a6b3c' },
                  { label: 'Allocated', count: stats?.allocated, total: stats?.total_assets, color: '#1a3b8b' },
                  { label: 'Under Maintenance', count: stats?.under_maintenance, total: stats?.total_assets, color: '#7a4d00' },
                ].map(({ label, count, total, color }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div className="flex-between mb-1">
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{count} / {total}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 99 }}>
                      <div style={{ height: '100%', borderRadius: 99, background: color, width: total ? `${Math.round((count / total) * 100)}%` : '0%', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
