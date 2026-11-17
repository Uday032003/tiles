import { Link } from 'react-router-dom';
import { ArrowRight, Layers, MapPin, Phone, User } from 'lucide-react';
import { formatArea, formatDate } from '../../utils/formatters.js';

export default function BuildingCard({ building }) {

  return (
    <Link
      to={`/buildings/${building.id}`}
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        transition: 'box-shadow 150ms ease, transform 150ms ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: '0.15rem 0 0',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {building.name}
          </h3>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <User size={14} />
          <span>{building.customerName}</span>
          {building.customerPhone && (
            <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              • <Phone size={12} /> {building.customerPhone}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <MapPin size={14} />
          <span>{building.location}</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <Layers size={14} />
          <span>{building.floorCount} floors</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <div className="stat-mini">
          <div className="stat-mini-label">Floor Area</div>
          <div className="stat-mini-value" style={{ fontSize: '0.86rem' }}>
            {formatArea(building.floorTileArea)}
          </div>
        </div>
        <div className="stat-mini">
          <div className="stat-mini-label">Wall Area</div>
          <div className="stat-mini-value" style={{ fontSize: '0.86rem' }}>
            {formatArea(building.wallTileArea)}
          </div>
        </div>
        <div className="stat-mini">
          <div className="stat-mini-label">Total</div>
          <div className="stat-mini-value" style={{ fontSize: '0.86rem', color: 'var(--primary)' }}>
            {formatArea(building.totalMeasuredArea)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>Updated {formatDate(building.updatedAt)}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', fontWeight: 600 }}>
          Open <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

