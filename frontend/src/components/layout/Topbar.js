import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Plus, Search, Settings, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useUI } from '../../context/UIContext.js';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { toggleSidebar, searchQuery, setSearchQuery, showToast } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const initials = (user?.fullName || 'DM')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    showToast('You have been logged out.', 'info');
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="mobile-brand-chip">
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'var(--primary)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '0.7rem',
              fontWeight: 800,
            }}
          >
            DM
          </span>
          <span>DM Tiles</span>
        </div>

        <div className="topbar-search">
          <Search size={16} className="topbar-search-icon" />
          <input
            type="search"
            className="topbar-search-input"
            placeholder="Search buildings, customers, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search buildings"
          />
        </div>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="btn btn-primary topbar-add-btn"
          onClick={() => navigate('/buildings?new=1')}
          title="Add New Building"
          aria-label="Add New Building"
        >
          <Plus size={16} />
          <span className="topbar-quick-add-label">New</span>
        </button>

        <div className="profile-menu-wrapper" ref={menuRef}>
          <button
            type="button"
            className="profile-pill"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="profile-avatar">{initials}</span>
            <span className="profile-name">{user?.fullName || 'Account'}</span>
          </button>

          {menuOpen && (
            <div className="profile-dropdown" role="menu">
              <div className="profile-dropdown-header">
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{user?.fullName}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {user?.email} • {user?.role}
                </div>
              </div>
              <button
                type="button"
                className="profile-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/settings');
                }}
              >
                <User size={15} />
                Profile & Account
              </button>
              <button
                type="button"
                className="profile-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/settings');
                }}
              >
                <Settings size={15} />
                Settings
              </button>
              <button
                type="button"
                className="profile-dropdown-item danger"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

