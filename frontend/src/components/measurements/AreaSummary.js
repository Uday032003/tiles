import { formatArea } from '../../utils/formatters.js';

export default function AreaSummary({ summary }) {
  if (!summary) return null;

  const areaCards = [
    { label: 'Floor Tiles', value: formatArea(summary.floorTilesSqft), accent: 'var(--primary)' },
    { label: 'Wall Tiles', value: formatArea(summary.wallTilesSqft) },
    { label: 'Granite (Area)', value: formatArea(summary.graniteSqft) },
    { label: 'Staircases', value: formatArea(summary.staircaseSqft) },
    { label: 'Elevation', value: formatArea(summary.elevationSqft) },
    { label: 'Other Area', value: formatArea(summary.otherSqft) },
    { label: 'Skirting', value: formatArea(summary.skirtingRunningFt, 'rft') },
    { label: 'Granite (Running)', value: formatArea(summary.graniteRunningFt, 'rft') },
    { label: 'Pieces', value: `${Number(summary.totalPieces || 0)} pcs` },
    {
      label: 'Total Area (Sq Ft)',
      value: formatArea(summary.totalMeasuredSqft),
      accent: 'var(--success)',
      highlight: true,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
        gap: '0.6rem',
      }}
    >
      {areaCards.map((item) => (
        <div
          key={item.label}
          className="stat-mini"
          style={
            item.highlight
              ? { background: 'var(--primary-soft)', borderColor: '#bfdbfe' }
              : undefined
          }
        >
          <div className="stat-mini-label">{item.label}</div>
          <div
            className="stat-mini-value"
            style={{
              fontSize: '0.92rem',
              color: item.accent || 'var(--text-primary)',
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

