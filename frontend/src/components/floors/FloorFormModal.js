import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../common/Modal.js';

const FLOOR_PRESETS = [
  { name: 'Basement', floorNumber: -1 },
  { name: 'Ground Floor', floorNumber: 0 },
  { name: 'First Floor', floorNumber: 1 },
  { name: 'Second Floor', floorNumber: 2 },
  { name: 'Third Floor', floorNumber: 3 },
  { name: 'Terrace', floorNumber: 4 },
];

const floorSchema = z.object({
  name: z.string().trim().min(1, 'Floor name is required').max(120),
  floorNumber: z.coerce.number().int().min(-10).max(200),
  notes: z.string().trim().max(2000).optional(),
});

export default function FloorFormModal({ isOpen, onClose, onSubmit, initialData = null, nextFloorNumber = 0 }) {
  const [serverError, setServerError] = useState('');
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(floorSchema),
    defaultValues: { name: '', floorNumber: nextFloorNumber, notes: '' },
  });

  useEffect(() => {
    if (!isOpen) return;
    setServerError('');
    if (initialData) {
      reset({
        name: initialData.name || '',
        floorNumber: initialData.floorNumber ?? 0,
        notes: initialData.notes || '',
      });
    } else {
      reset({ name: '', floorNumber: nextFloorNumber, notes: '' });
    }
  }, [isOpen, initialData, nextFloorNumber, reset]);

  const submitForm = async (values) => {
    setServerError('');
    try {
      await onSubmit({
        ...values,
        notes: values.notes || null,
      });
      onClose();
    } catch (err) {
      setServerError(err.message || 'Unable to save floor');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${initialData.name}` : 'Add Floor'}
      maxWidth={500}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="floor-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Floor'}
          </button>
        </>
      }
    >
      {serverError && <div className="alert alert-error">{serverError}</div>}

      {!isEditing && (
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Quick Presets
          </div>
          <div className="preset-chips">
            {FLOOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="preset-chip"
                onClick={() => {
                  setValue('name', preset.name, { shouldValidate: true });
                  setValue('floorNumber', preset.floorNumber, { shouldValidate: true });
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form id="floor-form" onSubmit={handleSubmit(submitForm)} noValidate>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="floor-name">
              Floor Name *
            </label>
            <input
              id="floor-name"
              type="text"
              className={`form-input ${errors.name ? 'form-input-error' : ''}`}
              placeholder="e.g., Ground Floor"
              {...register('name')}
            />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="floor-number">
              Floor Number
            </label>
            <input
              id="floor-number"
              type="number"
              inputMode="numeric"
              className={`form-input ${errors.floorNumber ? 'form-input-error' : ''}`}
              {...register('floorNumber')}
            />
            {errors.floorNumber && <span className="form-error">{errors.floorNumber.message}</span>}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="floor-notes">
            Notes (Optional)
          </label>
          <textarea
            id="floor-notes"
            rows={2}
            className="form-textarea"
            placeholder="Special tile specifications or notes..."
            {...register('notes')}
          />
        </div>
      </form>
    </Modal>
  );
}

