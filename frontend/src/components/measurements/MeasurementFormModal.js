import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../common/Modal.js';
import { calculateMeasurementPreview } from '../../utils/measurementCalculator.js';

const CATEGORY_TO_ROLE = {
  FLOOR_TILES: 'FLOOR',
  WALL_TILES: 'WALL',
  GRANITE: 'GRANITE',
  SKIRTING: 'SKIRTING',
  STAIRCASE: 'STAIRCASE',
  ELEVATION: 'ELEVATION',
  OTHER: 'OTHER',
};

const QUICK_PRESETS = [
  {
    label: 'Floor Tiles',
    workCode: 'FLOOR_TILES',
    name: 'Floor Tiles',
    inputMethod: 'DIMENSIONS',
    outputUnit: 'SQ_FT',
    surfaceRole: 'FLOOR',
  },
  {
    label: 'Bathroom 4 Walls',
    workCode: 'WALL_TILES',
    name: 'Bathroom Wall Tiles (4 Walls)',
    inputMethod: 'DIMENSIONS',
    outputUnit: 'SQ_FT',
    surfaceRole: 'WALL',
  },
  {
    label: 'Single Wall',
    workCode: 'WALL_TILES',
    name: 'Wall Tiles',
    inputMethod: 'DIMENSIONS',
    outputUnit: 'SQ_FT',
    surfaceRole: 'WALL',
  },
  {
    label: 'Elevation Tiles',
    workCode: 'ELEVATION_TILES',
    name: 'Elevation Tiles',
    inputMethod: 'DIMENSIONS',
    outputUnit: 'SQ_FT',
    surfaceRole: 'ELEVATION',
  },
  {
    label: 'Granite Platform (L-Shape)',
    workCode: 'KITCHEN_GRANITE_PLATFORM',
    name: 'Kitchen Granite Platform',
    inputMethod: 'SEGMENTS',
    outputUnit: 'SQ_FT',
    surfaceRole: 'GRANITE',
    segments: [
      { label: 'Main Counter', dimensionUnit: 'DECIMAL_FEET', lengthRaw: '8', widthRaw: '2', quantity: 1 },
      { label: 'L-Return', dimensionUnit: 'DECIMAL_FEET', lengthRaw: '5', widthRaw: '2', quantity: 1 },
    ],
  },
  {
    label: 'Door Threshold',
    workCode: 'DOOR_THRESHOLD',
    name: 'Granite Door Threshold',
    inputMethod: 'DIMENSIONS',
    outputUnit: 'PIECES',
    surfaceRole: 'GRANITE',
  },
  {
    label: 'Skirting',
    workCode: 'SKIRTING',
    name: 'Tile Skirting',
    inputMethod: 'DIMENSIONS',
    outputUnit: 'RUNNING_FT',
    surfaceRole: 'SKIRTING',
  },
];

export default function MeasurementFormModal({
  isOpen,
  onClose,
  onSubmit,
  workTypes = [],
  initialData = null,
  roomName = '',
}) {
  const isEditing = Boolean(initialData);
  const [serverError, setServerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [workTypeId, setWorkTypeId] = useState('');
  const [name, setName] = useState('');
  const [inputMethod, setInputMethod] = useState('DIMENSIONS');
  const [dimensionUnit, setDimensionUnit] = useState('DECIMAL_FEET');
  const [outputUnit, setOutputUnit] = useState('SQ_FT');
  const [surfaceRole, setSurfaceRole] = useState('FLOOR');
  const [lengthRaw, setLengthRaw] = useState('');
  const [widthRaw, setWidthRaw] = useState('');
  const [heightRaw, setHeightRaw] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [directArea, setDirectArea] = useState('');
  const [billableOverride, setBillableOverride] = useState('');
  const [notes, setNotes] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [segments, setSegments] = useState([]);
  const [deductions, setDeductions] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setServerError('');
    setIsSaving(false);

    if (initialData) {
      setWorkTypeId(initialData.workTypeId || '');
      setName(initialData.name || '');
      setInputMethod(initialData.inputMethod || 'DIMENSIONS');
      setDimensionUnit(
        initialData.dimensionUnit === 'NA' ? 'DECIMAL_FEET' : initialData.dimensionUnit || 'DECIMAL_FEET'
      );
      setOutputUnit(initialData.outputUnit || 'SQ_FT');
      setSurfaceRole(initialData.surfaceRole || 'FLOOR');
      setLengthRaw(initialData.lengthRaw || '');
      setWidthRaw(initialData.widthRaw || '');
      setHeightRaw(initialData.heightRaw || '');
      setQuantity(String(initialData.quantity ?? 1));
      setDirectArea(initialData.directArea != null ? String(initialData.directArea) : '');
      setBillableOverride(
        initialData.billableQuantity != null &&
          Number(initialData.billableQuantity) !== Number(initialData.netArea)
          ? String(initialData.billableQuantity)
          : ''
      );
      setNotes(initialData.notes || '');
      setChangeNote('');
      setSegments(
        (initialData.segments || []).map((s) => ({
          label: s.label,
          dimensionUnit: s.dimensionUnit || 'DECIMAL_FEET',
          lengthRaw: s.lengthRaw,
          widthRaw: s.widthRaw,
          quantity: s.quantity ?? 1,
        }))
      );
      setDeductions(
        (initialData.deductions || []).map((d) => ({
          label: d.label,
          deductionType: d.deductionType || 'OPENING',
          dimensionUnit: d.dimensionUnit || 'DECIMAL_FEET',
          lengthRaw: d.lengthRaw,
          widthRaw: d.widthRaw,
          quantity: d.quantity ?? 1,
        }))
      );
    } else {
      const defaultWt = workTypes[0] || null;
      setWorkTypeId(defaultWt?.id || '');
      setName(defaultWt ? defaultWt.name : '');
      setInputMethod('DIMENSIONS');
      setDimensionUnit('DECIMAL_FEET');
      setOutputUnit(defaultWt?.defaultUnit || 'SQ_FT');
      setSurfaceRole(CATEGORY_TO_ROLE[defaultWt?.category] || 'FLOOR');
      setLengthRaw('');
      setWidthRaw('');
      setHeightRaw('');
      setQuantity('1');
      setDirectArea('');
      setBillableOverride('');
      setNotes('');
      setChangeNote('');
      setSegments([]);
      setDeductions([]);
    }
  }, [isOpen, initialData, workTypes]);

  const handleWorkTypeChange = (newWtId) => {
    setWorkTypeId(newWtId);
    const wt = workTypes.find((w) => w.id === newWtId);
    if (!wt) return;
    setOutputUnit(wt.defaultUnit);
    setSurfaceRole(CATEGORY_TO_ROLE[wt.category] || 'OTHER');
    if (!isEditing && !name.trim()) {
      setName(wt.name);
    }
  };

  const applyPreset = (preset) => {
    const wt = workTypes.find((w) => w.code === preset.workCode) || workTypes[0];
    if (wt) setWorkTypeId(wt.id);
    setName(preset.name);
    setInputMethod(preset.inputMethod);
    setOutputUnit(preset.outputUnit);
    setSurfaceRole(preset.surfaceRole);
    if (preset.segments) {
      setSegments(preset.segments);
    } else if (preset.inputMethod !== 'SEGMENTS') {
      setSegments([]);
    }
  };

  const isWallLike = surfaceRole === 'WALL' || surfaceRole === 'ELEVATION';

  const preview = useMemo(
    () =>
      calculateMeasurementPreview({
        inputMethod,
        dimensionUnit: inputMethod === 'DIRECT_AREA' || outputUnit === 'PIECES' || outputUnit === 'FIXED' ? 'NA' : dimensionUnit,
        outputUnit,
        surfaceRole,
        lengthRaw,
        widthRaw,
        heightRaw,
        quantity,
        directArea,
        segments,
        deductions,
      }),
    [
      inputMethod,
      dimensionUnit,
      outputUnit,
      surfaceRole,
      lengthRaw,
      widthRaw,
      heightRaw,
      quantity,
      directArea,
      segments,
      deductions,
    ]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!workTypeId) {
      setServerError('Please select a work type.');
      return;
    }
    if (!name.trim()) {
      setServerError('Measurement name is required.');
      return;
    }
    if (preview.error) {
      setServerError(preview.error);
      return;
    }

    const effectiveDimUnit =
      inputMethod === 'DIRECT_AREA' || outputUnit === 'PIECES' || outputUnit === 'FIXED'
        ? 'NA'
        : dimensionUnit;

    const payload = {
      workTypeId,
      name: name.trim(),
      inputMethod,
      dimensionUnit: effectiveDimUnit,
      outputUnit,
      surfaceRole,
      lengthRaw: inputMethod === 'DIMENSIONS' && lengthRaw ? lengthRaw.trim() : null,
      widthRaw: inputMethod === 'DIMENSIONS' && !isWallLike && widthRaw ? widthRaw.trim() : null,
      heightRaw: inputMethod === 'DIMENSIONS' && isWallLike && heightRaw ? heightRaw.trim() : null,
      quantity: Number(quantity || 1),
      directArea: inputMethod === 'DIRECT_AREA' ? Number(directArea) : null,
      billableQuantity: billableOverride !== '' ? Number(billableOverride) : null,
      notes: notes.trim() || null,
      ...(isEditing && changeNote.trim() ? { changeNote: changeNote.trim() } : {}),
      segments: inputMethod === 'SEGMENTS' ? segments : [],
      deductions: outputUnit === 'SQ_FT' ? deductions : [],
    };

    setIsSaving(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setServerError(err.message || 'Failed to save measurement');
    } finally {
      setIsSaving(false);
    }
  };

  const addSegmentRow = () => {
    setSegments((prev) => [
      ...prev,
      {
        label: `Section ${prev.length + 1}`,
        dimensionUnit: dimensionUnit === 'NA' ? 'DECIMAL_FEET' : dimensionUnit,
        lengthRaw: '',
        widthRaw: '',
        quantity: 1,
      },
    ]);
  };

  const addDeductionRow = (presetType = 'DOOR', presetLabel = 'Door Deduction') => {
    setDeductions((prev) => [
      ...prev,
      {
        label: presetLabel,
        deductionType: presetType,
        dimensionUnit: dimensionUnit === 'NA' ? 'DECIMAL_FEET' : dimensionUnit,
        lengthRaw: '',
        widthRaw: '',
        quantity: 1,
      },
    ]);
  };

  const unitLabel =
    outputUnit === 'SQ_FT'
      ? 'sq ft'
      : outputUnit === 'RUNNING_FT'
        ? 'running ft'
        : outputUnit === 'PIECES'
          ? 'pieces'
          : 'fixed';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Measurement` : `Add Measurement${roomName ? ` — ${roomName}` : ''}`}
      maxWidth={720}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="measurement-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Measurement'}
          </button>
        </>
      }
    >
      {serverError && <div className="alert alert-error">{serverError}</div>}

      {!isEditing && (
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            QUICK PRESETS
          </div>
          <div className="preset-chips" style={{ marginBottom: 0 }}>
            {QUICK_PRESETS.map((p) => (
              <button key={p.label} type="button" className="preset-chip" onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form id="measurement-form" onSubmit={handleSubmit} noValidate>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="meas-work-type">
              Work Type *
            </label>
            <select
              id="meas-work-type"
              className="form-select"
              value={workTypeId}
              onChange={(e) => handleWorkTypeChange(e.target.value)}
            >
              {workTypes.map((wt) => (
                <option key={wt.id} value={wt.id}>
                  {wt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="meas-name">
              Measurement Label *
            </label>
            <input
              id="meas-name"
              type="text"
              className="form-input"
              placeholder="e.g., Master Bathroom Wall Tiles"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="meas-output-unit">
              Output Unit
            </label>
            <select
              id="meas-output-unit"
              className="form-select"
              value={outputUnit}
              onChange={(e) => setOutputUnit(e.target.value)}
            >
              <option value="SQ_FT">Square Feet (Area)</option>
              <option value="RUNNING_FT">Running Feet (Length)</option>
              <option value="PIECES">Pieces (Count)</option>
              <option value="FIXED">Fixed Work Item</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="meas-surface-role">
              Summary Category
            </label>
            <select
              id="meas-surface-role"
              className="form-select"
              value={surfaceRole}
              onChange={(e) => setSurfaceRole(e.target.value)}
            >
              <option value="FLOOR">Floor Tiles</option>
              <option value="WALL">Wall Tiles</option>
              <option value="GRANITE">Granite</option>
              <option value="SKIRTING">Skirting</option>
              <option value="STAIRCASE">Staircase</option>
              <option value="ELEVATION">Elevation</option>
              <option value="OTHER">Other Work</option>
            </select>
          </div>
        </div>

        {/* Input Method Tabs */}
        <div className="form-group">
          <span className="form-label">Entry Method</span>
          <div className="filter-pills">
            {[
              { id: 'DIMENSIONS', label: 'Dimensions (L × W/H)' },
              { id: 'DIRECT_AREA', label: 'Direct Area / Qty' },
              { id: 'SEGMENTS', label: 'Multiple Segments' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-pill ${inputMethod === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setInputMethod(tab.id);
                  if (tab.id === 'SEGMENTS' && segments.length === 0) {
                    addSegmentRow();
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Explicit Dimension Unit Selector */}
        {inputMethod !== 'DIRECT_AREA' && outputUnit !== 'PIECES' && outputUnit !== 'FIXED' && (
          <div className="form-group">
            <label className="form-label" htmlFor="meas-dim-unit">
              Dimension Input Mode (Explicit)
            </label>
            <select
              id="meas-dim-unit"
              className="form-select"
              value={dimensionUnit}
              onChange={(e) => setDimensionUnit(e.target.value)}
            >
              <option value="DECIMAL_FEET">Decimal Feet — e.g. 13.6 = 13.60 ft</option>
              <option value="FEET_INCHES">Feet &amp; Inches — e.g. 13&apos;6&quot; or 13-6 = 13.50 ft</option>
              <option value="INCHES">Inches Only — e.g. 18 = 1.50 ft</option>
            </select>
          </div>
        )}

        {/* Method 1: Dimensions */}
        {inputMethod === 'DIMENSIONS' && (
          <div className="card" style={{ background: 'var(--bg-page)', marginBottom: '1rem', padding: '1rem' }}>
            {outputUnit === 'PIECES' || outputUnit === 'FIXED' ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="meas-qty-only">
                  {outputUnit === 'PIECES' ? 'Number of Pieces *' : 'Fixed Work Units *'}
                </label>
                <input
                  id="meas-qty-only"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            ) : outputUnit === 'RUNNING_FT' ? (
              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="meas-len-rft">
                    Length ({dimensionUnit === 'FEET_INCHES' ? "e.g. 12'6\"" : dimensionUnit === 'INCHES' ? 'inches' : 'ft'}) *
                  </label>
                  <input
                    id="meas-len-rft"
                    type="text"
                    inputMode={dimensionUnit === 'FEET_INCHES' ? 'text' : 'decimal'}
                    className="form-input"
                    placeholder={dimensionUnit === 'FEET_INCHES' ? "12'6\"" : '12.5'}
                    value={lengthRaw}
                    onChange={(e) => setLengthRaw(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="meas-qty-rft">
                    Quantity
                  </label>
                  <input
                    id="meas-qty-rft"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="meas-len">
                    Length *
                  </label>
                  <input
                    id="meas-len"
                    type="text"
                    inputMode={dimensionUnit === 'FEET_INCHES' ? 'text' : 'decimal'}
                    className="form-input"
                    placeholder={dimensionUnit === 'FEET_INCHES' ? "13'6\"" : '13.6'}
                    value={lengthRaw}
                    onChange={(e) => setLengthRaw(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="meas-second">
                    {isWallLike ? 'Height *' : 'Width *'}
                  </label>
                  <input
                    id="meas-second"
                    type="text"
                    inputMode={dimensionUnit === 'FEET_INCHES' ? 'text' : 'decimal'}
                    className="form-input"
                    placeholder={dimensionUnit === 'FEET_INCHES' ? "7'0\"" : '7'}
                    value={isWallLike ? heightRaw : widthRaw}
                    onChange={(e) =>
                      isWallLike ? setHeightRaw(e.target.value) : setWidthRaw(e.target.value)
                    }
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="meas-qty">
                    Qty
                  </label>
                  <input
                    id="meas-qty"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Method 2: Direct Area */}
        {inputMethod === 'DIRECT_AREA' && (
          <div className="card" style={{ background: 'var(--bg-page)', marginBottom: '1rem', padding: '1rem' }}>
            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="meas-direct-area">
                  Direct Value ({unitLabel}) *
                </label>
                <input
                  id="meas-direct-area"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  placeholder="e.g., 45"
                  value={directArea}
                  onChange={(e) => setDirectArea(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="meas-direct-qty">
                  Multiplier / Quantity
                </label>
                <input
                  id="meas-direct-qty"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Method 3: Multiple Segments */}
        {inputMethod === 'SEGMENTS' && (
          <div className="card" style={{ background: 'var(--bg-page)', marginBottom: '1rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <strong style={{ fontSize: '0.88rem' }}>Rectangular Sections</strong>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addSegmentRow}>
                <Plus size={14} /> Add Section
              </button>
            </div>

            {segments.map((seg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr 0.9fr 0.9fr 0.6fr auto',
                  gap: '0.45rem',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 38, fontSize: '0.85rem' }}
                  placeholder="Section label"
                  value={seg.label}
                  onChange={(e) =>
                    setSegments((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item))
                    )
                  }
                />
                <select
                  className="form-select"
                  style={{ minHeight: 38, fontSize: '0.8rem' }}
                  value={seg.dimensionUnit}
                  onChange={(e) =>
                    setSegments((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, dimensionUnit: e.target.value } : item
                      )
                    )
                  }
                >
                  <option value="DECIMAL_FEET">Dec Ft</option>
                  <option value="FEET_INCHES">Ft&apos;In&quot;</option>
                  <option value="INCHES">Inches</option>
                </select>
                <input
                  type="text"
                  inputMode={seg.dimensionUnit === 'FEET_INCHES' ? 'text' : 'decimal'}
                  className="form-input"
                  style={{ minHeight: 38, fontSize: '0.85rem' }}
                  placeholder="Len"
                  value={seg.lengthRaw}
                  onChange={(e) =>
                    setSegments((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, lengthRaw: e.target.value } : item))
                    )
                  }
                />
                <input
                  type="text"
                  inputMode={seg.dimensionUnit === 'FEET_INCHES' ? 'text' : 'decimal'}
                  className="form-input"
                  style={{ minHeight: 38, fontSize: '0.85rem' }}
                  placeholder="Wid"
                  value={seg.widthRaw}
                  onChange={(e) =>
                    setSegments((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, widthRaw: e.target.value } : item))
                    )
                  }
                />
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  style={{ minHeight: 38, fontSize: '0.85rem' }}
                  placeholder="Qty"
                  value={seg.quantity}
                  onChange={(e) =>
                    setSegments((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, quantity: e.target.value } : item))
                    )
                  }
                />
                <button
                  type="button"
                  className="icon-btn danger"
                  disabled={segments.length <= 1}
                  onClick={() => setSegments((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remove section"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Deductions (Doors, Windows, Openings, Sink Cutouts) */}
        {outputUnit === 'SQ_FT' && (
          <div className="card" style={{ background: 'var(--bg-page)', marginBottom: '1rem', padding: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '0.6rem',
              }}
            >
              <strong style={{ fontSize: '0.88rem' }}>Optional Deductions ({deductions.length})</strong>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => addDeductionRow('DOOR', 'Door')}
                >
                  + Door
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => addDeductionRow('WINDOW', 'Window')}
                >
                  + Window
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => addDeductionRow('SINK_CUTOUT', 'Sink Cutout')}
                >
                  + Sink Cutout
                </button>
              </div>
            </div>

            {deductions.map((ded, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 0.85fr 0.85fr 0.55fr auto',
                  gap: '0.45rem',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 38, fontSize: '0.85rem' }}
                  placeholder="Label"
                  value={ded.label}
                  onChange={(e) =>
                    setDeductions((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item))
                    )
                  }
                />
                <select
                  className="form-select"
                  style={{ minHeight: 38, fontSize: '0.8rem' }}
                  value={ded.dimensionUnit}
                  onChange={(e) =>
                    setDeductions((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, dimensionUnit: e.target.value } : item
                      )
                    )
                  }
                >
                  <option value="DECIMAL_FEET">Dec Ft</option>
                  <option value="FEET_INCHES">Ft&apos;In&quot;</option>
                  <option value="INCHES">Inches</option>
                </select>
                <input
                  type="text"
                  inputMode={ded.dimensionUnit === 'FEET_INCHES' ? 'text' : 'decimal'}
                  className="form-input"
                  style={{ minHeight: 38, fontSize: '0.85rem' }}
                  placeholder="Len"
                  value={ded.lengthRaw}
                  onChange={(e) =>
                    setDeductions((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, lengthRaw: e.target.value } : item))
                    )
                  }
                />
                <input
                  type="text"
                  inputMode={ded.dimensionUnit === 'FEET_INCHES' ? 'text' : 'decimal'}
                  className="form-input"
                  style={{ minHeight: 38, fontSize: '0.85rem' }}
                  placeholder="H / W"
                  value={ded.widthRaw}
                  onChange={(e) =>
                    setDeductions((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, widthRaw: e.target.value } : item))
                    )
                  }
                />
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="form-input"
                  style={{ minHeight: 38, fontSize: '0.85rem' }}
                  placeholder="Qty"
                  value={ded.quantity}
                  onChange={(e) =>
                    setDeductions((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, quantity: e.target.value } : item))
                    )
                  }
                />
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => setDeductions((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remove deduction"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Live Calculation Summary */}
        <div
          className="card"
          style={{
            background: preview.error ? 'var(--danger-soft)' : 'var(--primary-soft)',
            borderColor: preview.error ? '#fecaca' : '#bfdbfe',
            marginBottom: '1rem',
            padding: '0.85rem 1rem',
          }}
        >
          {preview.error ? (
            <div style={{ color: 'var(--danger)', fontSize: '0.86rem', fontWeight: 600 }}>
              {preview.error}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Gross</div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                  {preview.grossArea} {unitLabel}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Deductions</div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--warning)' }}>
                  − {preview.deductionArea} {unitLabel}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Net Area / Qty</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                  {preview.netArea} {unitLabel}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="meas-billable">
              Billable Quantity Override (Optional)
            </label>
            <input
              id="meas-billable"
              type="number"
              step="any"
              inputMode="decimal"
              className="form-input"
              placeholder={preview.netArea ? `Default: ${preview.netArea}` : 'Defaults to Net'}
              value={billableOverride}
              onChange={(e) => setBillableOverride(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="meas-notes">
              Notes (Optional)
            </label>
            <input
              id="meas-notes"
              type="text"
              className="form-input"
              placeholder="e.g., 2x2 vitrified ivory tiles"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {isEditing && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="meas-change-note">
              Edit Reason (Saved to History)
            </label>
            <input
              id="meas-change-note"
              type="text"
              className="form-input"
              placeholder="e.g., Re-measured after window framing"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}

