import { CloudOff, Database, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '../../context/OfflineSyncContext.js';

export default function OfflineSyncBanner() {
  const { isOnline, pendingCount, isSyncing, flushQueue, openOfflineModal } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      style={{
        background: isOnline ? 'var(--primary-soft)' : 'var(--warning-soft)',
        borderBottom: `1px solid ${isOnline ? 'rgba(20, 184, 166, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
        color: isOnline ? 'var(--primary)' : 'var(--warning)',
        padding: '0.45rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.84rem',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        onClick={openOfflineModal}
        title="Click to view locally saved data"
      >
        <CloudOff size={15} />
        {!isOnline ? (
          <span>
            <strong>Offline Mode:</strong> Measurements & details are saved locally
            {pendingCount > 0 ? ` (${pendingCount} queued for sync)` : ' (Queue is empty)'}.
          </span>
        ) : (
          <span>
            <strong>{pendingCount}</strong> offline change(s) ready to sync to the server.
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{
            padding: '0.22rem 0.55rem',
            fontSize: '0.76rem',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
          onClick={openOfflineModal}
        >
          <Database size={12} />
          View Saved Data ({pendingCount})
        </button>

        {isOnline && pendingCount > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.22rem 0.65rem', fontSize: '0.76rem' }}
            disabled={isSyncing}
            onClick={flushQueue}
          >
            <RefreshCw size={12} className={isSyncing ? 'spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
}


