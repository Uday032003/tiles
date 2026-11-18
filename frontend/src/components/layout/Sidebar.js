import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Database,
  Settings,
} from 'lucide-react';
import { useUI } from '../../context/UIContext.js';
import { useOfflineSync } from '../../context/OfflineSyncContext.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/buildings', label: 'Buildings', icon: Building2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { sidebarOpen, closeSidebar } = useUI();
  const { pendingCount, openOfflineModal } = useOfflineSync();

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

          {/* Offline Mode Tab / Locally Saved Data */}
          <button
            type="button"
            className="sidebar-link"
            style={{
              background: 'none',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
            }}
            onClick={() => {
              closeSidebar();
              openOfflineModal();
            }}
            title="View locally saved offline data"
          >
            <Database size={18} />
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>Offline Data</span>
              {pendingCount > 0 ? (
                <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                  {pendingCount}
                </span>
              ) : (
                <span style={{ fontSize: '0.68rem', opacity: 0.6 }}>0 saved</span>
              )}
            </span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div>DM Tiles Contractor Suite</div>
          <div style={{ opacity: 0.7 }}>v1.0 • Mobile & Web</div>
        </div>
      </aside>
    </>
  );
}


