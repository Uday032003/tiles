import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.js';
import Topbar from './Topbar.js';
import OfflineSyncBanner from '../common/OfflineSyncBanner.js';
import ErrorBoundary from '../common/ErrorBoundary.js';
import { useUI } from '../../context/UIContext.js';

export default function AppLayout() {
  const location = useLocation();
  const { desktopCollapsed } = useUI();

  return (
    <div className={`app-shell ${desktopCollapsed ? 'desktop-collapsed' : ''}`}>
      <Sidebar />
      <div className="main-wrapper">
        <Topbar />
        <OfflineSyncBanner />
        <main className="main-content">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

