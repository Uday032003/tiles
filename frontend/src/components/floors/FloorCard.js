import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUp, Copy, Edit2, Layers, Trash2 } from 'lucide-react';
import { formatArea } from '../../utils/formatters.js';

export default function FloorCard({
  buildingId,
  floor,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDuplicate,
  onDelete,
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--primary-soft)',
              color: 'var(--primary)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Layers size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Level {floor.floorNumber}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700 }}>{floor.name}</h3>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move up"
            aria-label={`Move ${floor.name} up`}
          >
            <ArrowUp size={15} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onMoveDown}
            disabled={isLast}
            title="Move down"
            aria-label={`Move ${floor.name} down`}
          >
            <ArrowDown size={15} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => onDuplicate(floor)}
            title="Duplicate floor"
            aria-label={`Duplicate ${floor.name}`}
          >
            <Copy size={15} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => onEdit(floor)}
            title="Edit floor"
            aria-label={`Edit ${floor.name}`}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => onDelete(floor)}
            title="Delete floor"
            aria-label={`Delete ${floor.name}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {floor.notes && (
        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{floor.notes}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.5rem' }}>
        <div className="stat-mini">
          <div className="stat-mini-label">Rooms</div>
          <div className="stat-mini-value">{floor.roomCount}</div>
        </div>
        <div className="stat-mini">
          <div className="stat-mini-label">Floor Tiles</div>
          <div className="stat-mini-value" style={{ fontSize: '0.86rem' }}>
            {formatArea(floor.floorTileArea)}
          </div>
        </div>
        <div className="stat-mini">
          <div className="stat-mini-label">Wall Tiles</div>
          <div className="stat-mini-value" style={{ fontSize: '0.86rem' }}>
            {formatArea(floor.wallTileArea)}
          </div>
        </div>
        <div className="stat-mini">
          <div className="stat-mini-label">Total Area</div>
          <div className="stat-mini-value" style={{ fontSize: '0.86rem', color: 'var(--primary)' }}>
            {formatArea(floor.totalMeasuredArea)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Link to={`/buildings/${buildingId}/floors/${floor.id}`} className="btn btn-secondary btn-sm">
          Manage Rooms & Areas <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

