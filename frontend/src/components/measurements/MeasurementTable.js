import { Copy, Edit2, History, Trash2 } from 'lucide-react';
import { formatArea } from '../../utils/formatters.js';

function formatUnit(unit) {
  if (unit === 'SQ_FT') return 'sq ft';
  if (unit === 'RUNNING_FT') return 'rft';
  if (unit === 'PIECES') return 'pcs';
  return 'fixed';
}

function formatInputFormula(m) {
  if (m.inputMethod === 'DIRECT_AREA') {
    return `Direct: ${m.directArea} × ${m.quantity}`;
  }
  if (m.inputMethod === 'SEGMENTS') {
    return `${m.segments?.length || 0} sections`;
  }
  if (m.outputUnit === 'PIECES' || m.outputUnit === 'FIXED') {
    return `Qty: ${m.quantity}`;
  }
  if (m.outputUnit === 'RUNNING_FT') {
    return `${m.lengthRaw || m.lengthFt} × ${m.quantity}`;
  }
  const second = m.heightRaw || m.widthRaw || m.heightFt || m.widthFt;
  return `${m.lengthRaw || m.lengthFt} × ${second}${Number(m.quantity) !== 1 ? ` × ${m.quantity}` : ''}`;
}

export default function MeasurementTable({
  measurements = [],
  showLocation = false,
  onEdit,
  onDuplicate,
  onViewHistory,
  onDelete,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {measurements.map((m) => {
        const unit = formatUnit(m.outputUnit);
        return (
          <div
            key={m.id}
            className="card"
            style={{
              padding: '0.95rem 1.1rem',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.85rem',
            }}
          >
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.98rem' }}>{m.name}</strong>
                <span className="badge badge-neutral">{m.workTypeName || m.surfaceRole}</span>
                {m.dimensionUnit === 'FEET_INCHES' && (
                  <span className="badge badge-primary">Ft &amp; In</span>
                )}
              </div>

              {showLocation && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {m.buildingName} → {m.floorName} → {m.roomName}
                </div>
              )}

              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                <span>{formatInputFormula(m)}</span>
                {m.deductions?.length > 0 && (
                  <span style={{ color: 'var(--warning)', marginLeft: '0.5rem' }}>
                    • {m.deductions.length} deduction(s): −{formatArea(m.deductionArea, unit)}
                  </span>
                )}
                {m.notes && <span style={{ marginLeft: '0.5rem' }}>• {m.notes}</span>}
              </div>

              {m.segments?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
                  {m.segments.map((s) => (
                    <span
                      key={s.id}
                      style={{
                        fontSize: '0.74rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 6,
                        background: 'var(--bg-muted)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {s.label}: {s.lengthRaw}×{s.widthRaw} = {s.areaSqft}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Gross {formatArea(m.grossArea, unit)}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {formatArea(m.netArea, unit)}
                </div>
                {Number(m.billableQuantity) !== Number(m.netArea) && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--success)', fontWeight: 600 }}>
                    Billable: {formatArea(m.billableQuantity, unit)}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {onEdit && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onEdit(m)}
                    title="Edit measurement"
                    aria-label={`Edit ${m.name}`}
                  >
                    <Edit2 size={15} />
                  </button>
                )}
                {onDuplicate && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onDuplicate(m)}
                    title="Duplicate measurement"
                    aria-label={`Duplicate ${m.name}`}
                  >
                    <Copy size={15} />
                  </button>
                )}
                {onViewHistory && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onViewHistory(m)}
                    title="View edit history"
                    aria-label={`History for ${m.name}`}
                  >
                    <History size={15} />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => onDelete(m)}
                    title="Delete measurement"
                    aria-label={`Delete ${m.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

