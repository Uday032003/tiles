import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Settings,
} from 'lucide-react';
import { useUI } from '../../context/UIContext.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/buildings', label: 'Buildings', icon: Building2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { sidebarOpen, closeSidebar } = useUI();

  return (
    <>
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="sidebar-logo">DM</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">DM Tiles</span>
            <span className="sidebar-brand-sub">Measurement & Work</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div>DM Tiles Contractor Suite</div>
          <div style={{ opacity: 0.7 }}>v1.0 • Mobile & Web</div>
        </div>
      </aside>
    </>
  );
}

