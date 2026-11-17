import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../common/Modal.js';

const roomSchema = z.object({
  roomTypeId: z.string().optional(),
  name: z.string().trim().min(1, 'Room or area name is required').max(120),
  notes: z.string().trim().max(2000).optional(),
});

export default function RoomFormModal({
  isOpen,
  onClose,
  onSubmit,
  roomTypes = [],
  existingRooms = [],
  initialData = null,
}) {
  const [serverError, setServerError] = useState('');
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(roomSchema),
    defaultValues: { roomTypeId: '', name: '', notes: '' },
  });

  const selectedRoomTypeId = watch('roomTypeId');

  useEffect(() => {
    if (!isOpen) return;
    setServerError('');
    if (initialData) {
      reset({
        roomTypeId: initialData.roomTypeId || '',
        name: initialData.name || '',
        notes: initialData.notes || '',
      });
    } else {
      reset({ roomTypeId: '', name: '', notes: '' });
    }
  }, [isOpen, initialData, reset]);

  const handleRoomTypeSelect = (typeId) => {
    setValue('roomTypeId', typeId);
    if (isEditing || !typeId) return;

    const chosen = roomTypes.find((rt) => rt.id === typeId);
    if (!chosen) return;

    const sameTypeCount = existingRooms.filter((r) => r.roomTypeId === typeId).length;
    const suggestedName = sameTypeCount === 0 ? chosen.name : `${chosen.name} ${sameTypeCount + 1}`;
    setValue('name', suggestedName, { shouldValidate: true });
  };

  const submitForm = async (values) => {
    setServerError('');
    try {
      await onSubmit({
        roomTypeId: values.roomTypeId || null,
        name: values.name,
        notes: values.notes || null,
      });
      onClose();
    } catch (err) {
      setServerError(err.message || 'Unable to save room');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${initialData.name}` : 'Add Room / Work Area'}
      maxWidth={540}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="room-form" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Room'}
          </button>
        </>
      }
    >
      {serverError && <div className="alert alert-error">{serverError}</div>}

      {!isEditing && roomTypes.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Quick Categories (Unlimited rooms of any type)
          </div>
          <div className="preset-chips">
            {roomTypes.map((rt) => (
              <button
                key={rt.id}
                type="button"
                className="preset-chip"
                style={
                  selectedRoomTypeId === rt.id
                    ? { background: 'var(--primary-soft)', borderColor: 'var(--primary)', color: 'var(--primary)' }
                    : undefined
                }
                onClick={() => handleRoomTypeSelect(rt.id)}
              >
                {rt.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form id="room-form" onSubmit={handleSubmit(submitForm)} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="room-type">
            Room Category
          </label>
          <select
            id="room-type"
            className="form-select"
            value={selectedRoomTypeId}
            onChange={(e) => handleRoomTypeSelect(e.target.value)}
          >
            <option value="">Custom / Uncategorized</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="room-name">
            Room / Area Name *
          </label>
          <input
            id="room-name"
            type="text"
            className={`form-input ${errors.name ? 'form-input-error' : ''}`}
            placeholder="e.g., Master Bedroom 1, Outside Bathroom 2"
            {...register('name')}
          />
          {errors.name && <span className="form-error">{errors.name.message}</span>}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="room-notes">
            Notes (Optional)
          </label>
          <textarea
            id="room-notes"
            rows={2}
            className="form-textarea"
            placeholder="Tile size, granite color, or special instructions..."
            {...register('notes')}
          />
        </div>
      </form>
    </Modal>
  );
}

