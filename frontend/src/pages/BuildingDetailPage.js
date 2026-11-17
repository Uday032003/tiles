import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Trash2,
} from 'lucide-react';
import { buildingService } from '../services/buildingService.js';
import { useUI } from '../context/UIContext.js';
import LoadingSkeleton from '../components/common/LoadingSkeleton.js';
import ErrorState from '../components/common/ErrorState.js';
import ConfirmationDialog from '../components/common/ConfirmationDialog.js';
import BuildingFormModal from '../components/buildings/BuildingFormModal.js';
import BuildingMeasurementsTab from '../components/measurements/BuildingMeasurementsTab.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function BuildingDetailPage() {
  const { id: buildingId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useUI();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isValidUuid = Boolean(buildingId && UUID_REGEX.test(buildingId));

  const buildingQuery = useQuery({
    queryKey: ['building', buildingId],
    queryFn: () => buildingService.getById(buildingId),
    enabled: isValidUuid,
    retry: 1,
  });

  // If a floor ID was provided in the URL and resolved by the backend to its building, sync the URL
  useEffect(() => {
    if (buildingQuery.data?.id && buildingQuery.data.id !== buildingId) {
      navigate(`/buildings/${buildingQuery.data.id}`, { replace: true });
    }
  }, [buildingQuery.data, buildingId, navigate]);

  const updateBuildingMutation = useMutation({
    mutationFn: (payload) => buildingService.update(buildingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      showToast('Building details updated.', 'success');
    },
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: () => buildingService.remove(buildingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setDeleteConfirmOpen(false);
      showToast('Building deleted.', 'info');
      navigate('/buildings', { replace: true });
    },
  });

  if (!isValidUuid) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', maxWidth: 480, margin: '1rem auto' }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>Invalid Building Link</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
          The link or building identifier is invalid. Please select a building from the list.
        </p>
        <Link to="/buildings" className="btn btn-primary btn-sm">
          <ArrowLeft size={14} /> Back to Buildings
        </Link>
      </div>
    );
  }

  if (buildingQuery.isError) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem 1.25rem', maxWidth: 500, margin: '1rem auto' }}>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--danger)' }}>Building Not Found</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
          {buildingQuery.error?.message || 'This building does not exist or has been deleted.'}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <Link to="/buildings" className="btn btn-primary btn-sm">
            <ArrowLeft size={14} /> Back to Buildings
          </Link>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => buildingQuery.refetch()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const building = buildingQuery.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      {/* Compact Top Navigation & Building Profile Header */}
      {!building ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.35rem 0.65rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            minHeight: 38,
          }}
        >
          <Link
            to="/buildings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              background: 'var(--bg-muted)',
            }}
            title="Back to Buildings"
          >
            <ArrowLeft size={12} /> Back
          </Link>
          <div className="skeleton" style={{ width: 130, height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 170, height: 13, borderRadius: 4 }} />
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.65rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flexWrap: 'wrap' }}>
            <Link
              to="/buildings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                background: 'var(--bg-muted)',
              }}
              title="Back to Buildings"
            >
              <ArrowLeft size={12} /> Back
            </Link>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {building.name}
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              ({[building.customerName, building.customerPhone, building.location].filter(Boolean).join(' • ')})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ minHeight: 24, padding: '0.12rem 0.45rem', fontSize: '0.72rem' }}
              onClick={() => setEditOpen(true)}
              title="Edit Building Details"
            >
              <Edit2 size={11} /> Edit
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              style={{ minHeight: 24, padding: '0.12rem 0.45rem', fontSize: '0.72rem' }}
              onClick={() => setDeleteConfirmOpen(true)}
              title="Delete Building"
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Main Measurements Workspace (Entry Form Modal + Summary Card) */}
      <BuildingMeasurementsTab buildingId={buildingId} building={building} />

      <BuildingFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        initialData={building}
        onSubmit={(values) => updateBuildingMutation.mutateAsync(values)}
      />

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => deleteBuildingMutation.mutate()}
        title="Delete Building"
        message={`Are you sure you want to delete "${building?.name || 'this building'}"? All floors, rooms, and measurements inside it will be hidden.`}
        confirmLabel="Delete Building"
        confirmVariant="danger"
        isLoading={deleteBuildingMutation.isPending}
      />
    </div>
  );
}
