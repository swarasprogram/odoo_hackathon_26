import { useLocation } from 'react-router-dom';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/org-setup': 'Organization Setup',
  '/assets': 'Asset Directory',
  '/allocations': 'Asset Allocations & Transfers',
  '/bookings': 'Resource Bookings',
  '/maintenance': 'Maintenance Management',
  '/audits': 'Asset Audits',
  '/reports': 'Reports & Analytics',
  '/notifications': 'Notifications',
  '/activity-logs': 'Activity Logs',
};

export default function Header({ actions }) {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || 'AssetFlow';

  return (
    <header className="header">
      <span className="header-title">{title}</span>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}
