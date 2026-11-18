import { useState } from 'react';
import {
  CheckCircle2,
  CloudOff,
  Database,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Modal from './Modal.js';
import { useOfflineSync } from '../../context/OfflineSyncContext.js';

export default function OfflineDataModal({ isOpen, onClose }) {
  const {
    isOnline,
    queuedItems = [],
    isSyncing,
    flushQueue,
    clearQueue,
    removeItem,
  } = useOfflineSync();

  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  const getMethodBadgeClass = (method) => {
    switch (String(method).toUpperCase()) {
      case 'POST':
        return 'badge-success';
      case 'PATCH':
      case 'PUT':
        return 'badge-primary';
      case 'DELETE':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const handleSyncAll = async () => {
    await flushQueue();
  };

  const handleClearAll = async () => {
    await clearQueue();
    setConfirmClear(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirmClear(false);
        onClose();
      }}
      title="Locally Saved Data"
      maxWidth={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            {queuedItems.length > 0 && (
              confirmClear ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.76rem', color: '#f87171' }}>Clear all local data?</span>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    onClick={handleClearAll}
                  >
                    Confirm Clear
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.76rem', padding: '0.25rem 0.6rem', color: '#f87171' }}
                  onClick={() => setConfirmClear(true)}
                  title="Discard all queued local changes"
                >
                  <Trash2 size={13} /> Clear All
                </button>
              )
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setConfirmClear(false);
                onClose();
              }}
            >
              Close
            </button>

            {isOnline && queuedItems.length > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSyncAll}
                disabled={isSyncing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
                {isSyncing ? 'Syncing...' : 'Sync All Now'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Status Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.6rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: isOnline ? 'rgba(20, 184, 166, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${isOnline ? 'rgba(20, 184, 166, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}>
            {isOnline ? (
              <>
                <Wifi size={14} color="var(--primary)" />
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Connected to Server</span>
              </>
            ) : (
              <>
                <WifiOff size={14} color="var(--warning)" />
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Offline Mode Active</span>
              </>
            )}
          </div>

          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            <span style={{ fontWeight: 700, color: queuedItems.length > 0 ? 'var(--warning)' : 'var(--primary)' }}>
              {queuedItems.length}
            </span>{' '}
            locally saved item{queuedItems.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* List or Empty State */}
        {queuedItems.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              background: 'rgba(30, 41, 59, 0.35)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(20, 184, 166, 0.15)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--primary)',
              }}
            >
              <CheckCircle2 size={26} />
            </div>
            <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#f8fafc' }}>
              No Locally Saved Data
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.45 }}>
              All measurements, rooms, and building changes are currently in sync with the server.
              Any changes you make while offline will be stored safely here.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              maxHeight: '340px',
              overflowY: 'auto',
              paddingRight: '0.2rem',
            }}
          >
            {queuedItems.map((item, idx) => {
              const measurement = item.data?.initialMeasurement || item.data;
              const hasDimensions = measurement?.widthRaw && measurement?.lengthRaw;
              const isStaircase = item.data?.stepCount || item.data?.treadCount;

              return (
                <div
                  key={item.id || idx}
                  style={{
                    padding: '0.65rem 0.8rem',
                    background: 'rgba(30, 41, 59, 0.55)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className={`badge ${getMethodBadgeClass(item.method)}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                        {item.method}
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: '#f1f5f9' }}>
                        {item.label || 'Saved Offline Action'}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {formatTimestamp(item.createdAt)}
                      </span>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ padding: '0.2rem', color: '#94a3b8' }}
                        onClick={() => removeItem(item.id)}
                        title="Remove from queue"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Additional item details if present */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.76rem', color: '#94a3b8' }}>
                    {hasDimensions && (
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                        Size: <strong style={{ color: '#cbd5e1' }}>{measurement.widthRaw} ft × {measurement.lengthRaw} ft</strong>
                      </span>
                    )}
                    {isStaircase && (
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                        Steps: <strong style={{ color: '#cbd5e1' }}>{item.data?.stepCount || item.data?.treadCount}</strong>
                      </span>
                    )}
                    {measurement?.surfaceRole && (
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                        Surface: <strong style={{ color: '#cbd5e1' }}>{measurement.surfaceRole}</strong>
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontFamily: 'monospace' }}>
                      {item.url}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
