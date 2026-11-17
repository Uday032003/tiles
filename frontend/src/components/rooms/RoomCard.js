import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUp, DoorOpen, Edit2, Ruler, Trash2 } from 'lucide-react';
import { formatArea } from '../../utils/formatters.js';

export default function RoomCard({
  buildingId,
  floorId,
  room,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: 'var(--bg-muted)',
              color: 'var(--navy-900)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <DoorOpen size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>{room.name}</h3>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {room.roomTypeName || 'Custom Area'} • {room.measurementCount} entries
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move up"
            aria-label={`Move ${room.name} up`}
          >
            <ArrowUp size={15} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onMoveDown}
            disabled={isLast}
            title="Move down"
            aria-label={`Move ${room.name} down`}
          >
            <ArrowDown size={15} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => onEdit(room)}
            title="Edit room"
            aria-label={`Edit ${room.name}`}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => onDelete(room)}
            title="Delete room"
            aria-label={`Delete ${room.name}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {room.notes && (
        <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{room.notes}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <div className="stat-mini">
          <div className="stat-mini-label">Floor</div>
          <div className="stat-mini-value" style={{ fontSize: '0.84rem' }}>
            {formatArea(room.floorTileArea)}
          </div>
        </div>
        <div className="stat-mini">
          <div className="stat-mini-label">Wall</div>
          <div className="stat-mini-value" style={{ fontSize: '0.84rem' }}>
            {formatArea(room.wallTileArea)}
          </div>
        </div>
        <div className="stat-mini">
          <div className="stat-mini-label">Total</div>
          <div className="stat-mini-value" style={{ fontSize: '0.84rem', color: 'var(--primary)' }}>
            {formatArea(room.totalMeasuredArea)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <Ruler size={13} /> {room.measurementCount} measurement(s)
        </span>
        <Link
          to={`/buildings/${buildingId}/floors/${floorId}/rooms/${room.id}`}
          className="btn btn-secondary btn-sm"
        >
          Measure <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

