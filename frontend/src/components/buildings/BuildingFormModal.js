import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../common/Modal.js';
import { toDateInputValue } from '../../utils/formatters.js';

const buildingSchema = z.object({
  name: z.string().trim().min(2, 'Building name is required').max(160),
  customerName: z.string().trim().min(2, 'Customer name is required').max(160),
  customerPhone: z.string().trim().max(30).optional(),
  location: z.string().trim().min(2, 'Location is required').max(160),
  address: z.string().trim().max(1000).optional(),
  description: z.string().trim().max(2000).optional(),
  startDate: z.string().optional(),
  expectedCompletionDate: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export default function BuildingFormModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const [serverError, setServerError] = useState('');
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: '',
      customerName: '',
      customerPhone: '',
      location: '',
      address: '',
      description: '',
      startDate: '',
      expectedCompletionDate: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    setServerError('');
    if (initialData) {
      reset({
        name: initialData.name || '',
        customerName: initialData.customerName || '',
        customerPhone: initialData.customerPhone || '',
        location: initialData.location || '',
        address: initialData.address || '',
        description: initialData.description || '',
        startDate: toDateInputValue(initialData.startDate),
        expectedCompletionDate: toDateInputValue(initialData.expectedCompletionDate),
        notes: initialData.notes || '',
      });
    } else {
      reset({
        name: '',
        customerName: '',
        customerPhone: '',
        location: '',
        address: '',
        description: '',
        startDate: '',
        expectedCompletionDate: '',
        notes: '',
      });
    }
  }, [isOpen, initialData, reset]);

  const submitForm = async (values) => {
    setServerError('');
    try {
      await onSubmit({
        ...values,
        customerPhone: values.customerPhone || null,
        address: values.address || null,
        description: values.description || null,
        startDate: values.startDate || null,
        expectedCompletionDate: values.expectedCompletionDate || null,
        notes: values.notes || null,
        initialLayout: 'NONE',
      });
      onClose();
    } catch (err) {
      setServerError(err.message || 'Unable to save building');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${initialData.name}` : 'Add New Building'}
      maxWidth={640}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="building-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Building'}
          </button>
        </>
      }
    >
      {serverError && <div className="alert alert-error">{serverError}</div>}

      <form id="building-form" onSubmit={handleSubmit(submitForm)} noValidate>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="bld-name">
              Building Name *
            </label>
            <input
              id="bld-name"
              type="text"
              className={`form-input ${errors.name ? 'form-input-error' : ''}`}
              placeholder="e.g., Sri Lakshmi Residency"
              {...register('name')}
            />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bld-location">
              Location / City *
            </label>
            <input
              id="bld-location"
              type="text"
              className={`form-input ${errors.location ? 'form-input-error' : ''}`}
              placeholder="e.g., Rajahmundry"
              {...register('location')}
            />
            {errors.location && <span className="form-error">{errors.location.message}</span>}
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="bld-customer">
              Customer Name *
            </label>
            <input
              id="bld-customer"
              type="text"
              className={`form-input ${errors.customerName ? 'form-input-error' : ''}`}
              placeholder="e.g., Mr. Prasad"
              {...register('customerName')}
            />
            {errors.customerName && <span className="form-error">{errors.customerName.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bld-phone">
              Customer Phone
            </label>
            <input
              id="bld-phone"
              type="tel"
              inputMode="tel"
              className="form-input"
              placeholder="e.g., 9876543210"
              {...register('customerPhone')}
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="bld-start">
              Start Date
            </label>
            <input id="bld-start" type="date" className="form-input" {...register('startDate')} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bld-expected">
              Expected Completion Date
            </label>
            <input
              id="bld-expected"
              type="date"
              className="form-input"
              {...register('expectedCompletionDate')}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="bld-address">
            Site Address
          </label>
          <textarea
            id="bld-address"
            rows={2}
            className="form-textarea"
            placeholder="Street, landmark, door number..."
            {...register('address')}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="bld-description">
            Description
          </label>
          <textarea
            id="bld-description"
            rows={2}
            className="form-textarea"
            placeholder="Scope of work (floor tiles, bathrooms, granite platform, stairs...)"
            {...register('description')}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="bld-notes">
            Contractor Notes
          </label>
          <textarea
            id="bld-notes"
            rows={2}
            className="form-textarea"
            placeholder="Internal site notes..."
            {...register('notes')}
          />
        </div>
      </form>
    </Modal>
  );
}

