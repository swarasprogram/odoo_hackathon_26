import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Building2, Package, ArrowLeftRight,
  CalendarDays, Wrench, ClipboardCheck, BarChart3,
  Bell, FileText, LogOut, ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['all'] },
  { label: 'MANAGE', type: 'section' },
  { to: '/org-setup', icon: Building2, label: 'Org Setup', roles: ['admin'] },
  { to: '/assets', icon: Package, label: 'Assets', roles: ['all'] },
  { to: '/allocations', icon: ArrowLeftRight, label: 'Allocations', roles: ['all'] },
  { to: '/bookings', icon: CalendarDays, label: 'Resource Bookings', roles: ['all'] },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance', roles: ['all'] },
  { to: '/audits', icon: ClipboardCheck, label: 'Audits', roles: ['admin', 'asset_manager'] },
  { label: 'INSIGHTS', type: 'section' },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'asset_manager', 'department_head'] },
  { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['all'] },
  { to: '/activity-logs', icon: FileText, label: 'Activity Logs', roles: ['admin', 'asset_manager'] },
];

function getInitials(name = '') {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function roleLabel(role) {
  return { admin: 'Administrator', asset_manager: 'Asset Manager', department_head: 'Dept. Head', employee: 'Employee' }[role] || role;
}

export default function Sidebar() {
  const { user, logout, isAdmin, isAssetManager } = useAuth();
  const navigate = useNavigate();

  const { data: notifData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 30000,
  });
  const unread = notifData?.count || 0;

  const canSee = (roles) => {
    if (roles.includes('all')) return true;
    if (!user) return false;
    return roles.includes(user.role) || (roles.includes('admin') && isAdmin) || (roles.includes('asset_manager') && isAssetManager);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">AF</div>
        <div>
          <div className="logo-text">AssetFlow</div>
          <div className="logo-sub">Enterprise ERP</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item, i) => {
          if (item.type === 'section') {
            return <div key={i} className="nav-label" style={{ marginTop: i > 0 ? 8 : 0 }}>{item.label}</div>;
          }
          if (!canSee(item.roles)) return null;
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              {item.label}
              {item.to === '/notifications' && unread > 0 && (
                <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" onClick={() => navigate('/profile')}>
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{roleLabel(user?.role)}</div>
          </div>
          <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        </div>
        <button
          className="btn btn-ghost w-full mt-1"
          style={{ justifyContent: 'flex-start', color: 'var(--text-3)', fontSize: 13 }}
          onClick={() => { logout(); navigate('/login'); }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
