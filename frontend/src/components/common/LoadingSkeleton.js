export default function LoadingSkeleton({ lines = 3, height = 20 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton"
          style={{
            height: `${height}px`,
            width: idx === lines - 1 ? '65%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

