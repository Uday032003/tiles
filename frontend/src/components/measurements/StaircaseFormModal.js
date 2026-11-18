import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../common/Modal.js';
import { calculateStaircasePreview } from '../../utils/measurementCalculator.js';

export default function StaircaseFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  floors = [],
  activeFloorId = null,
}) {
  const isEditing = Boolean(initialData);
  const [serverError, setServerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [name, setName] = useState('Main Staircase');
  const [isUniformSteps, setIsUniformSteps] = useState(true);
  const [treadCount, setTreadCount] = useState('10');
  const [riserCount, setRiserCount] = useState('11');
  const [treadWidthFt, setTreadWidthFt] = useState('3.5');
  const [treadDepthFt, setTreadDepthFt] = useState('1');
  const [riserHeightFt, setRiserHeightFt] = useState('0.5');
  const [landingLengthFt, setLandingLengthFt] = useState('0');
  const [landingWidthFt, setLandingWidthFt] = useState('0');
  const [skirtingLengthFt, setSkirtingLengthFt] = useState('0');
  const [stepsData, setStepsData] = useState([]);
  const [notes, setNotes] = useState('');

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
      setIsUniformSteps(initialData.isUniformSteps !== false);
      setTreadCount(String(initialData.treadCount ?? 0));
      setRiserCount(String(initialData.riserCount ?? 0));
      setTreadWidthFt(String(initialData.treadWidthFt ?? 0));
      setTreadDepthFt(String(initialData.treadDepthFt ?? 0));
      setRiserHeightFt(String(initialData.riserHeightFt ?? 0));
      setLandingLengthFt(String(initialData.landingLengthFt ?? 0));
      setLandingWidthFt(String(initialData.landingWidthFt ?? 0));
      setSkirtingLengthFt(String(initialData.skirtingLengthFt ?? 0));
      setStepsData(initialData.stepsData || []);
      setNotes(initialData.notes || '');
    } else {
      setName('Main Staircase');
      setIsUniformSteps(true);
      setTreadCount('10');
      setRiserCount('11');
      setTreadWidthFt('3.5');
      setTreadDepthFt('1');
      setRiserHeightFt('0.5');
      setLandingLengthFt('0');
      setLandingWidthFt('0');
      setSkirtingLengthFt('0');
      setStepsData([]);
      setNotes('');
    }
  }, [isOpen, initialData, activeFloorId, floors]);

  const preview = useMemo(
    () =>
      calculateStaircasePreview({
        isUniformSteps,
        treadCount,
        riserCount,
        treadWidthFt,
        treadDepthFt,
        riserHeightFt,
        landingLengthFt,
        landingWidthFt,
        stepsData,
      }),
    [
      isUniformSteps,
      treadCount,
      riserCount,
      treadWidthFt,
      treadDepthFt,
      riserHeightFt,
      landingLengthFt,
      landingWidthFt,
      stepsData,
    ]
  );

  const addStepRow = () => {
    setStepsData((prev) => [
      ...prev,
      {
        treadWidthFt: Number(treadWidthFt) || 3.5,
        treadDepthFt: Number(treadDepthFt) || 1,
        riserHeightFt: Number(riserHeightFt) || 0.5,
        hasTread: true,
        hasRiser: true,
      },
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!name.trim()) {
      setServerError('Staircase name is required');
      return;
    }
    if (!isUniformSteps && stepsData.length === 0) {
      setServerError('Add at least one step for non-uniform staircase measurement');
      return;
    }

    setIsSaving(true);
    try {
      if (onSubmit) {
        await onSubmit({
          floorId: selectedFloorId || null,
          name: name.trim(),
          isUniformSteps,
          treadCount: Number(treadCount || 0),
          riserCount: Number(riserCount || 0),
          treadWidthFt: Number(treadWidthFt || 0),
          treadDepthFt: Number(treadDepthFt || 0),
          riserHeightFt: Number(riserHeightFt || 0),
          landingLengthFt: Number(landingLengthFt || 0),
          landingWidthFt: Number(landingWidthFt || 0),
          skirtingLengthFt: Number(skirtingLengthFt || 0),
          stepsData: isUniformSteps ? [] : stepsData,
          notes: notes.trim() || null,
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
      title={isEditing ? `Edit ${initialData.name}` : 'Add Staircase Measurement'}
      maxWidth={720}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="staircase-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Staircase' : 'Add Staircase'}
          </button>
        </>
      }
    >
      {serverError && <div className="alert alert-error">{serverError}</div>}

      <form id="staircase-form" onSubmit={handleSubmit} noValidate>
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

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="stair-name">
              Staircase Name *
            </label>
            <input
              id="stair-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <span className="form-label">Step Type</span>
            <div className="filter-pills">
              <button
                type="button"
                className={`filter-pill ${isUniformSteps ? 'active' : ''}`}
                onClick={() => setIsUniformSteps(true)}
              >
                Uniform Steps
              </button>
              <button
                type="button"
                className={`filter-pill ${!isUniformSteps ? 'active' : ''}`}
                onClick={() => {
                  setIsUniformSteps(false);
                  if (stepsData.length === 0) addStepRow();
                }}
              >
                Step-by-Step (Non-Uniform)
              </button>
            </div>
          </div>
        </div>

        {isUniformSteps ? (
          <div className="card" style={{ background: 'var(--bg-page)', marginBottom: '1rem', padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.65rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tread Count</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="form-input"
                  value={treadCount}
                  onChange={(e) => setTreadCount(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Riser Count</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="form-input"
                  value={riserCount}
                  onChange={(e) => setRiserCount(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Width (ft)</label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  value={treadWidthFt}
                  onChange={(e) => setTreadWidthFt(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tread Depth (ft)</label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  value={treadDepthFt}
                  onChange={(e) => setTreadDepthFt(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Riser Height (ft)</label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  value={riserHeightFt}
                  onChange={(e) => setRiserHeightFt(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ background: 'var(--bg-page)', marginBottom: '1rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <strong style={{ fontSize: '0.88rem' }}>Individual Steps ({stepsData.length})</strong>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addStepRow}>
                <Plus size={14} /> Add Step
              </button>
            </div>
            {stepsData.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '0.5fr 1fr 1fr 1fr auto auto auto',
                  gap: '0.4rem',
                  alignItems: 'center',
                  marginBottom: '0.45rem',
                }}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>#{idx + 1}</span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  style={{ minHeight: 36, fontSize: '0.84rem' }}
                  placeholder="Width ft"
                  value={step.treadWidthFt}
                  onChange={(e) =>
                    setStepsData((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, treadWidthFt: e.target.value } : s))
                    )
                  }
                />
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  style={{ minHeight: 36, fontSize: '0.84rem' }}
                  placeholder="Depth ft"
                  value={step.treadDepthFt}
                  onChange={(e) =>
                    setStepsData((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, treadDepthFt: e.target.value } : s))
                    )
                  }
                />
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  style={{ minHeight: 36, fontSize: '0.84rem' }}
                  placeholder="Riser ft"
                  value={step.riserHeightFt}
                  onChange={(e) =>
                    setStepsData((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, riserHeightFt: e.target.value } : s))
                    )
                  }
                />
                <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <input
                    type="checkbox"
                    checked={step.hasTread !== false}
                    onChange={(e) =>
                      setStepsData((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, hasTread: e.target.checked } : s))
                      )
                    }
                  />
                  T
                </label>
                <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <input
                    type="checkbox"
                    checked={step.hasRiser !== false}
                    onChange={(e) =>
                      setStepsData((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, hasRiser: e.target.checked } : s))
                      )
                    }
                  />
                  R
                </label>
                <button
                  type="button"
                  className="icon-btn danger"
                  disabled={stepsData.length <= 1}
                  onClick={() => setStepsData((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Landing Length (ft)</label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              className="form-input"
              value={landingLengthFt}
              onChange={(e) => setLandingLengthFt(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Landing Width (ft)</label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              className="form-input"
              value={landingWidthFt}
              onChange={(e) => setLandingWidthFt(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Skirting Length (rft)</label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              className="form-input"
              value={skirtingLengthFt}
              onChange={(e) => setSkirtingLengthFt(e.target.value)}
            />
          </div>
        </div>

        <div
          className="card"
          style={{
            background: 'var(--primary-soft)',
            borderColor: '#bfdbfe',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>Tread Area</div>
              <div style={{ fontWeight: 700 }}>{preview.treadAreaSqft} sq ft</div>
            </div>
            <div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>Riser Area</div>
              <div style={{ fontWeight: 700 }}>{preview.riserAreaSqft} sq ft</div>
            </div>
            <div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>Landing</div>
              <div style={{ fontWeight: 700 }}>{preview.landingAreaSqft} sq ft</div>
            </div>
            <div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>Staircase Total</div>
              <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{preview.totalAreaSqft} sq ft</div>
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Notes (Optional)</label>
          <textarea
            rows={2}
            className="form-textarea"
            placeholder="Granite nosing, bullnose, anti-skid grooves..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

