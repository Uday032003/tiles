import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../common/Modal.js';

const duplicateSchema = z.object({
  name: z.string().trim().min(1, 'New floor name is required').max(120),
  floorNumber: z.coerce.number().int().min(-10).max(200),
  copyMeasurements: z.boolean(),
});

export default function DuplicateFloorModal({ isOpen, onClose, sourceFloor, onSubmit }) {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(duplicateSchema),
    defaultValues: { name: '', floorNumber: 1, copyMeasurements: true },
  });

  useEffect(() => {
    if (!isOpen || !sourceFloor) return;
    setServerError('');
    reset({
      name: `${sourceFloor.name} (Copy)`,
      floorNumber: Number(sourceFloor.floorNumber || 0) + 1,
      copyMeasurements: true,
    });
  }, [isOpen, sourceFloor, reset]);

  const submitForm = async (values) => {
    setServerError('');
    try {
      await onSubmit(sourceFloor.id, values);
      onClose();
    } catch (err) {
      setServerError(err.message || 'Failed to duplicate floor');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Duplicate "${sourceFloor?.name || 'Floor'}"`}
      maxWidth={480}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="dup-floor-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Duplicating...' : 'Duplicate Floor'}
          </button>
        </>
      }
    >
      {serverError && <div className="alert alert-error">{serverError}</div>}

      <p style={{ marginTop: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
        Creates a new floor with brand-new IDs by copying all rooms from{' '}
        <strong>{sourceFloor?.name}</strong>.
      </p>

      <form id="dup-floor-form" onSubmit={handleSubmit(submitForm)} noValidate>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="dup-floor-name">
              New Floor Name *
            </label>
            <input
              id="dup-floor-name"
              type="text"
              className={`form-input ${errors.name ? 'form-input-error' : ''}`}
              {...register('name')}
            />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dup-floor-number">
              Floor Number
            </label>
            <input
              id="dup-floor-number"
              type="number"
              inputMode="numeric"
              className="form-input"
              {...register('floorNumber')}
            />
          </div>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <input type="checkbox" {...register('copyMeasurements')} style={{ width: 18, height: 18 }} />
          Copy existing measurements, segments, and deductions too
        </label>
      </form>
    </Modal>
  );
}

