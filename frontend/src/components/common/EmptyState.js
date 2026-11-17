export default function EmptyState({ icon: Icon, title, description, action = null }) {
  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.65rem',
      }}
    >
      {Icon && (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--primary-soft)',
            color: 'var(--primary)',
            display: 'grid',
            placeItems: 'center',
            marginBottom: '0.25rem',
          }}
        >
          <Icon size={24} />
        </div>
      )}
      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{title}</h3>
      {description && (
        <p style={{ margin: 0, maxWidth: '420px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
    </div>
  );
}

