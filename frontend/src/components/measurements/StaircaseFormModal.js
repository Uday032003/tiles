import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Modal from '../common/Modal.js';

export default function StaircaseFormModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete = null,
  initialData = null,
  floors = [],
  activeFloorId = null,
}) {
  const isEditing = Boolean(initialData);
  const [serverError, setServerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [name, setName] = useState('Main Staircase');
  const [stepCount, setStepCount] = useState('15');

  useEffect(() => {
    if (!isOpen) return;
    setServerError('');
    setIsSaving(false);

    if (activeFloorId) {
      setSelectedFloorId(activeFloorId);
    } else if (floors && floors.length > 0) {
      setSelectedFloorId(floors[0].id);
    }

    if (initialData) {
      setName(initialData.name || 'Main Staircase');
      setStepCount(String(initialData.treadCount || initialData.stepCount || 15));
    } else {
      setName('Main Staircase');
      setStepCount('15');
    }
  }, [isOpen, initialData, activeFloorId, floors]);

  const countNum = Math.max(0, parseInt(stepCount, 10) || 0);
  // Standard step area: 3.5 ft width * (1.0 ft tread + 0.5 ft riser) = 5.25 sq ft per step
  const calculatedArea = Math.round(countNum * 3.5 * 1.5 * 10) / 10;

  const handleStepDelta = (delta) => {
    setStepCount((prev) => String(Math.max(1, (parseInt(prev, 10) || 0) + delta)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!name.trim()) {
      setServerError('Staircase name is required');
      return;
    }
    if (countNum <= 0) {
      setServerError('Please enter a valid step count (at least 1 step)');
      return;
    }

    const tWidth = 3.5;
    const tDepth = 1.0;
    const rHeight = 0.5;
    const totalArea = Math.round(countNum * tWidth * (tDepth + rHeight) * 100) / 100;

    setIsSaving(true);
    try {
      if (onSubmit) {
        await onSubmit({
          id: initialData?.id || null,
          floorId: selectedFloorId || null,
          name: name.trim(),
          isUniformSteps: true,
          stepCount: countNum,
          treadCount: countNum,
          riserCount: countNum,
          treadWidthFt: tWidth,
          treadDepthFt: tDepth,
          riserHeightFt: rHeight,
          landingLengthFt: 0,
          landingWidthFt: 0,
          skirtingLengthFt: 0,
          stepsData: [],
          totalAreaSqft: totalArea,
          notes: null,
        });
      }
      onClose();
    } catch (err) {
      setServerError(err.message || 'Unable to save staircase measurement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${initialData?.name || 'Staircase'}` : 'Add Staircase'}
      maxWidth={440}
    >
      {serverError && (
        <div className="alert alert-error" style={{ marginBottom: '0.85rem' }}>
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {floors && floors.length > 1 && (
          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label className="form-label" htmlFor="stair-floor">
              Target Floor
            </label>
            <select
              id="stair-floor"
              className="form-select"
              value={selectedFloorId}
              onChange={(e) => setSelectedFloorId(e.target.value)}
            >
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '0.85rem' }}>
          <label className="form-label" htmlFor="stair-name">
            Staircase Name
          </label>
          <input
            id="stair-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main Staircase, Internal Stairs..."
          />
        </div>

        {/* Step Count Only with Stepper Buttons */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label" style={{ marginBottom: '0.35rem' }}>
            Step Count (Number of Steps)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              type="button"
              onClick={() => handleStepDelta(-1)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(51, 65, 85, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Decrease steps by 1"
            >
              <Minus size={16} />
            </button>

            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={stepCount}
                onChange={(e) => setStepCount(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  padding: '0 2.5rem 0 0.5rem',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              >
                steps
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleStepDelta(1)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(51, 65, 85, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Increase steps by 1"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Live Area Preview Banner */}
        {countNum > 0 && (
          <div
            style={{
              background: 'rgba(20, 184, 166, 0.12)',
              border: '1px solid rgba(20, 184, 166, 0.35)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Calculated Area ({countNum} steps):
            </span>
            <span style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
              {calculatedArea} sq ft
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {isEditing && onDelete && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => onDelete(initialData)}
                disabled={isSaving}
                style={{ fontSize: '0.76rem', padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Trash2 size={13} /> Delete Staircase
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || countNum <= 0}>
              {isSaving ? 'Saving...' : isEditing ? 'Save Staircase' : 'Add Staircase'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
