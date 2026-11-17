import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({ message = 'Something went wrong loading data.', onRetry = null }) {
  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '2rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.65rem',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'var(--danger-soft)',
          color: 'var(--danger)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <AlertTriangle size={22} />
      </div>
      <div style={{ fontWeight: 600 }}>Unable to load data</div>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: 420 }}>
        {message}
      </p>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={15} /> Try Again
        </button>
      )}
    </div>
  );
}

