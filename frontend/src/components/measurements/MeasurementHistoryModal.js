import { useQuery } from '@tanstack/react-query';
import Modal from '../common/Modal.js';
import LoadingSkeleton from '../common/LoadingSkeleton.js';
import { measurementService } from '../../services/measurementService.js';
import { formatDate } from '../../utils/formatters.js';

export default function MeasurementHistoryModal({ measurement, onClose }) {
  const historyQuery = useQuery({
    queryKey: ['measurement-history', measurement?.id],
    queryFn: () => measurementService.getHistory(measurement.id),
    enabled: Boolean(measurement?.id),
  });

  return (
    <Modal
      isOpen={Boolean(measurement)}
      onClose={onClose}
      title={`History — ${measurement?.name || ''}`}
      maxWidth={560}
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {historyQuery.isLoading ? (
        <LoadingSkeleton lines={3} height={44} />
      ) : historyQuery.isError ? (
        <div className="alert alert-error">{historyQuery.error.message}</div>
      ) : (historyQuery.data || []).length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No edit history recorded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {historyQuery.data.map((entry) => (
            <div
              key={entry.id}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                background: 'var(--bg-page)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <strong>{entry.changeNote || 'Updated'}</strong>
                <span style={{ color: 'var(--text-muted)' }}>
                  {formatDate(entry.createdAt)} • {entry.changedByName}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                {entry.previousData && (
                  <span>
                    Previous Net: <strong>{entry.previousData.netArea}</strong> →{' '}
                  </span>
                )}
                New Net: <strong>{entry.newData?.netArea}</strong> (Gross:{' '}
                {entry.newData?.grossArea}, Deductions: {entry.newData?.deductionArea})
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

