import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import api from '../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const MONO = ['#111111', '#3a3a3a', '#6b6b6b', '#9b9b9b', '#c8c8c8', '#e2e2e2'];

export default function Reports() {
  const { data: utilization = [] } = useQuery({ queryKey: ['utilization'], queryFn: () => api.get('/reports/utilization').then(r => r.data) });
  const { data: deptAlloc = [] } = useQuery({ queryKey: ['dept-alloc'], queryFn: () => api.get('/reports/department-allocation').then(r => r.data) });
  const { data: maintFreq = [] } = useQuery({ queryKey: ['maint-freq'], queryFn: () => api.get('/reports/maintenance-frequency').then(r => r.data) });
  const { data: statusDist = [] } = useQuery({ queryKey: ['status-dist'], queryFn: () => api.get('/reports/asset-status-distribution').then(r => r.data) });

  return (
    <Layout>
      <div className="page-header">
        <div><h1>Reports & Analytics</h1><p>Operational insights across assets, maintenance, and resource usage</p></div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><h3>Asset Status Distribution</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist.filter(s => s.count > 0)} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status}: ${count}`}>
                  {statusDist.map((_, i) => <Cell key={i} fill={MONO[i % MONO.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Maintenance by Category</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={maintFreq} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="maintenance_count" fill="#111111" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3>Department Asset Allocation</h3></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={deptAlloc} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="department_name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="allocated_assets" name="Allocated Assets" fill="#111111" radius={[4, 4, 0, 0]} />
              <Bar dataKey="employee_count" name="Employees" fill="#9b9b9b" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Top Used Assets</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Rank</th><th>Asset Tag</th><th>Name</th><th>Status</th><th>Allocation Count</th><th>Booking Count</th><th>Total Usage</th></tr></thead>
            <tbody>
              {utilization.slice(0, 10).map((a, i) => (
                <tr key={a.asset_id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-3)' }}>#{i + 1}</td>
                  <td><span className="chip">{a.asset_tag}</span></td>
                  <td>{a.asset_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{a.status.replace(/_/g, ' ')}</td>
                  <td>{a.allocation_count}</td>
                  <td>{a.booking_count}</td>
                  <td><b>{a.total_usage}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
