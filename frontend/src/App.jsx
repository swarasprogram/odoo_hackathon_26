import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrgSetup from './pages/OrgSetup';
import AssetDirectory from './pages/AssetDirectory';
import Allocations from './pages/Allocations';
import ResourceBooking from './pages/ResourceBooking';
import Maintenance from './pages/Maintenance';
import Audits from './pages/Audits';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';

function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/org-setup" element={<PrivateRoute roles={['admin']}><OrgSetup /></PrivateRoute>} />
      <Route path="/assets" element={<PrivateRoute><AssetDirectory /></PrivateRoute>} />
      <Route path="/allocations" element={<PrivateRoute><Allocations /></PrivateRoute>} />
      <Route path="/bookings" element={<PrivateRoute><ResourceBooking /></PrivateRoute>} />
      <Route path="/maintenance" element={<PrivateRoute><Maintenance /></PrivateRoute>} />
      <Route path="/audits" element={<PrivateRoute roles={['admin', 'asset_manager']}><Audits /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute roles={['admin', 'asset_manager', 'department_head']}><Reports /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/activity-logs" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
