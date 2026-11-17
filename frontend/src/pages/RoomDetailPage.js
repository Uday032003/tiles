import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Plus, Ruler, Trash2 } from 'lucide-react';
import { roomService } from '../services/roomService.js';
import { measurementService } from '../services/measurementService.js';
import { staircaseService } from '../services/staircaseService.js';
import { useUI } from '../context/UIContext.js';
import LoadingSkeleton from '../components/common/LoadingSkeleton.js';
import ErrorState from '../components/common/ErrorState.js';
import EmptyState from '../components/common/EmptyState.js';
import ConfirmationDialog from '../components/common/ConfirmationDialog.js';
import AreaSummary from '../components/measurements/AreaSummary.js';
import MeasurementFormModal from '../components/measurements/MeasurementFormModal.js';
import MeasurementTable from '../components/measurements/MeasurementTable.js';
import MeasurementHistoryModal from '../components/measurements/MeasurementHistoryModal.js';
import StaircaseFormModal from '../components/measurements/StaircaseFormModal.js';
import { formatArea } from '../utils/formatters.js';

export default function RoomDetailPage() {
  const { id: buildingId, floorId, roomId } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useUI();

  const [measModalOpen, setMeasModalOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState(null);
  const [deletingMeasurement, setDeletingMeasurement] = useState(null);
  const [historyMeasurement, setHistoryMeasurement] = useState(null);

  const [stairModalOpen, setStairModalOpen] = useState(false);
  const [editingStaircase, setEditingStaircase] = useState(null);
  const [deletingStaircase, setDeletingStaircase] = useState(null);

  const roomQuery = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomService.getById(roomId),
  });

  const workTypesQuery = useQuery({
    queryKey: ['work-types'],
    queryFn: () => measurementService.listWorkTypes(),
    staleTime: 10 * 60 * 1000,
  });

  const measurementsQuery = useQuery({
    queryKey: ['room-measurements', roomId],
    queryFn: () => measurementService.listByRoom(roomId),
  });

  const staircasesQuery = useQuery({
    queryKey: ['room-staircases', roomId],
    queryFn: () => staircaseService.listByRoom(roomId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['room-measurements', roomId] });
    queryClient.invalidateQueries({ queryKey: ['room-staircases', roomId] });
    queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    queryClient.invalidateQueries({ queryKey: ['floor-rooms', floorId] });
    queryClient.invalidateQueries({ queryKey: ['floor-summary', floorId] });
    queryClient.invalidateQueries({ queryKey: ['building-summary', buildingId] });
    queryClient.invalidateQueries({ queryKey: ['building-floors', buildingId] });
    queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
    queryClient.invalidateQueries({ queryKey: ['measurements'] });
  };

  const saveMeasurementMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? measurementService.update(id, payload) : measurementService.create(roomId, payload),
    onSuccess: (_data, vars) => {
      invalidateAll();
      showToast(vars.id ? 'Measurement updated.' : 'Measurement saved.', 'success');
    },
  });

  const duplicateMeasurementMutation = useMutation({
    mutationFn: (id) => measurementService.duplicate(id),
    onSuccess: () => {
      invalidateAll();
      showToast('Measurement duplicated.', 'success');
    },
  });

  const deleteMeasurementMutation = useMutation({
    mutationFn: (id) => measurementService.remove(id),
    onSuccess: () => {
      invalidateAll();
      setDeletingMeasurement(null);
      showToast('Measurement deleted.', 'info');
    },
  });

  const saveStaircaseMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? staircaseService.update(id, payload) : staircaseService.create(roomId, payload),
    onSuccess: (_data, vars) => {
      invalidateAll();
      showToast(vars.id ? 'Staircase updated.' : 'Staircase saved.', 'success');
    },
  });

  const deleteStaircaseMutation = useMutation({
    mutationFn: (id) => staircaseService.remove(id),
    onSuccess: () => {
      invalidateAll();
      setDeletingStaircase(null);
      showToast('Staircase deleted.', 'info');
    },
  });

  if (roomQuery.isLoading) {
    return (
      <div className="card">
        <LoadingSkeleton lines={5} height={24} />
      </div>
    );
  }

  if (roomQuery.isError) {
    return <ErrorState message={roomQuery.error.message} onRetry={() => roomQuery.refetch()} />;
  }

  const room = roomQuery.data;
  const measurements = measurementsQuery.data || [];
  const staircases = staircasesQuery.data || [];
  const workTypes = workTypesQuery.data || [];

  const sumRole = (role, unit = 'SQ_FT') =>
    measurements
      .filter((m) => m.surfaceRole === role && m.outputUnit === unit)
      .reduce((acc, m) => acc + Number(m.netArea || 0), 0);

  const staircaseCalcSqft = staircases.reduce((acc, s) => acc + Number(s.totalAreaSqft || 0), 0);
  const staircaseSkirtingFt = staircases.reduce((acc, s) => acc + Number(s.skirtingLengthFt || 0), 0);

  const roomSummary = {
    floorTilesSqft: sumRole('FLOOR', 'SQ_FT'),
    wallTilesSqft: sumRole('WALL', 'SQ_FT'),
    graniteSqft: sumRole('GRANITE', 'SQ_FT'),
    staircaseSqft: sumRole('STAIRCASE', 'SQ_FT') + staircaseCalcSqft,
    elevationSqft: sumRole('ELEVATION', 'SQ_FT'),
    otherSqft: sumRole('OTHER', 'SQ_FT'),
    skirtingRunningFt: sumRole('SKIRTING', 'RUNNING_FT') + staircaseSkirtingFt,
    graniteRunningFt: sumRole('GRANITE', 'RUNNING_FT'),
    totalPieces: measurements
      .filter((m) => m.outputUnit === 'PIECES')
      .reduce((acc, m) => acc + Number(m.netArea || 0), 0),
    totalMeasuredSqft:
      measurements
        .filter((m) => m.outputUnit === 'SQ_FT')
        .reduce((acc, m) => acc + Number(m.netArea || 0), 0) + staircaseCalcSqft,
  };

  return (
    <div>
      <div style={{ marginBottom: '0.85rem' }}>
        <Link
          to={`/buildings/${buildingId}/floors/${floorId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.86rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft size={16} /> Back to {room.floorName || 'Floor'}
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <span className="badge badge-neutral">{room.roomTypeName || 'Custom Area'}</span>
            <h1 className="page-title" style={{ marginTop: '0.35rem' }}>
              {room.name}
            </h1>
            {room.notes && <p className="page-subtitle">{room.notes}</p>}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setEditingStaircase(null);
                setStairModalOpen(true);
              }}
            >
              <Plus size={15} /> Staircase Calculator
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingMeasurement(null);
                setMeasModalOpen(true);
              }}
            >
              <Plus size={16} /> Add Measurement
            </button>
          </div>
        </div>

        <AreaSummary summary={roomSummary} />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.08rem', fontWeight: 700 }}>
          Measurements ({measurements.length})
        </h2>

        {measurementsQuery.isLoading ? (
          <LoadingSkeleton lines={3} height={60} />
        ) : measurements.length === 0 ? (
          <EmptyState
            icon={Ruler}
            title="No measurements recorded for this room"
            description="Record floor tiles, wall tiles, bathroom walls with door/window deductions, granite platforms, or skirting."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditingMeasurement(null);
                  setMeasModalOpen(true);
                }}
              >
                <Plus size={16} /> Add First Measurement
              </button>
            }
          />
        ) : (
          <MeasurementTable
            measurements={measurements}
            onEdit={(m) => {
              setEditingMeasurement(m);
              setMeasModalOpen(true);
            }}
            onDuplicate={(m) => duplicateMeasurementMutation.mutate(m.id)}
            onViewHistory={(m) => setHistoryMeasurement(m)}
            onDelete={(m) => setDeletingMeasurement(m)}
          />
        )}
      </div>

      <div>
        <div className="page-header" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700 }}>
            Staircase Calculations ({staircases.length})
          </h2>
        </div>

        {staircases.length === 0 ? (
          <div className="card" style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            No staircases added in this room. Use <strong>Staircase Calculator</strong> above if this
            area includes granite/tile steps, risers, and landings.
          </div>
        ) : (
          <div className="grid-2">
            {staircases.map((sc) => (
              <div key={sc.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{sc.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {sc.isUniformSteps ? 'Uniform Steps' : 'Step-by-Step'} • {sc.treadCount} treads,{' '}
                      {sc.riserCount} risers
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => {
                        setEditingStaircase(sc);
                        setStairModalOpen(true);
                      }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => setDeletingStaircase(sc)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem', marginTop: '0.75rem' }}>
                  <div className="stat-mini">
                    <div className="stat-mini-label">Treads</div>
                    <div className="stat-mini-value" style={{ fontSize: '0.84rem' }}>
                      {formatArea(sc.treadAreaSqft)}
                    </div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-label">Risers</div>
                    <div className="stat-mini-value" style={{ fontSize: '0.84rem' }}>
                      {formatArea(sc.riserAreaSqft)}
                    </div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-label">Landing</div>
                    <div className="stat-mini-value" style={{ fontSize: '0.84rem' }}>
                      {formatArea(sc.landingAreaSqft)}
                    </div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-label">Total</div>
                    <div className="stat-mini-value" style={{ fontSize: '0.86rem', color: 'var(--primary)' }}>
                      {formatArea(sc.totalAreaSqft)}
                    </div>
                  </div>
                </div>
                {Number(sc.skirtingLengthFt) > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Skirting: {formatArea(sc.skirtingLengthFt, 'rft')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <MeasurementFormModal
        isOpen={measModalOpen}
        onClose={() => {
          setMeasModalOpen(false);
          setEditingMeasurement(null);
        }}
        workTypes={workTypes}
        initialData={editingMeasurement}
        roomName={room.name}
        onSubmit={(payload) =>
          saveMeasurementMutation.mutateAsync({
            id: editingMeasurement?.id || null,
            payload,
          })
        }
      />

      <MeasurementHistoryModal
        measurement={historyMeasurement}
        onClose={() => setHistoryMeasurement(null)}
      />

      <ConfirmationDialog
        isOpen={Boolean(deletingMeasurement)}
        onClose={() => setDeletingMeasurement(null)}
        onConfirm={() => deleteMeasurementMutation.mutate(deletingMeasurement.id)}
        title="Delete Measurement"
        message={`Delete "${deletingMeasurement?.name}"?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteMeasurementMutation.isPending}
      />

      <StaircaseFormModal
        isOpen={stairModalOpen}
        onClose={() => {
          setStairModalOpen(false);
          setEditingStaircase(null);
        }}
        initialData={editingStaircase}
        onSubmit={(payload) =>
          saveStaircaseMutation.mutateAsync({
            id: editingStaircase?.id || null,
            payload,
          })
        }
      />

      <ConfirmationDialog
        isOpen={Boolean(deletingStaircase)}
        onClose={() => setDeletingStaircase(null)}
        onConfirm={() => deleteStaircaseMutation.mutate(deletingStaircase.id)}
        title="Delete Staircase"
        message={`Delete staircase "${deletingStaircase?.name}"?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteStaircaseMutation.isPending}
      />
    </div>
  );
}

