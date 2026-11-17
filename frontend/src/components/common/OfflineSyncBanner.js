import { CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '../../context/OfflineSyncContext.js';

export default function OfflineSyncBanner() {
  const { isOnline, pendingCount, isSyncing, flushQueue } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      style={{
        background: isOnline ? 'var(--primary-soft)' : 'var(--warning-soft)',
        borderBottom: `1px solid ${isOnline ? 'rgba(20, 184, 166, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
        color: isOnline ? 'var(--primary)' : 'var(--warning)',
        padding: '0.5rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.84rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CloudOff size={15} />
        {!isOnline ? (
          <span>
            <strong>Offline Mode:</strong> Measurements & details are saved locally
            {pendingCount > 0 ? ` (${pendingCount} queued for sync)` : ''}.
          </span>
        ) : (
          <span>
            <strong>{pendingCount}</strong> offline change(s) ready to sync to the server.
          </span>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
          disabled={isSyncing}
          onClick={flushQueue}
        >
          <RefreshCw size={13} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      )}
    </div>
  );
}

