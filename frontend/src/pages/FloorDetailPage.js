import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, DoorOpen, Edit2, Plus } from 'lucide-react';
import { floorService } from '../services/floorService.js';
import { roomService } from '../services/roomService.js';
import { measurementService } from '../services/measurementService.js';
import { useUI } from '../context/UIContext.js';
import AreaSummary from '../components/measurements/AreaSummary.js';
import LoadingSkeleton from '../components/common/LoadingSkeleton.js';
import ErrorState from '../components/common/ErrorState.js';
import EmptyState from '../components/common/EmptyState.js';
import ConfirmationDialog from '../components/common/ConfirmationDialog.js';
import FloorFormModal from '../components/floors/FloorFormModal.js';
import DuplicateFloorModal from '../components/floors/DuplicateFloorModal.js';
import RoomFormModal from '../components/rooms/RoomFormModal.js';
import RoomCard from '../components/rooms/RoomCard.js';
import { formatArea } from '../utils/formatters.js';

export default function FloorDetailPage() {
  const { id: buildingId, floorId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useUI();

  const [editFloorOpen, setEditFloorOpen] = useState(false);
  const [dupFloorOpen, setDupFloorOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);

  const floorQuery = useQuery({
    queryKey: ['floor', floorId],
    queryFn: () => floorService.getById(floorId),
  });

  const roomsQuery = useQuery({
    queryKey: ['floor-rooms', floorId],
    queryFn: () => roomService.listByFloor(floorId),
  });

  const roomTypesQuery = useQuery({
    queryKey: ['room-types'],
    queryFn: () => roomService.listRoomTypes(),
    staleTime: 10 * 60 * 1000,
  });

  const floorSummaryQuery = useQuery({
    queryKey: ['floor-summary', floorId],
    queryFn: () => measurementService.getFloorSummary(floorId),
  });

  const updateFloorMutation = useMutation({
    mutationFn: (payload) => floorService.update(floorId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor', floorId] });
      queryClient.invalidateQueries({ queryKey: ['building-floors', buildingId] });
      showToast('Floor updated.', 'success');
    },
  });

  const duplicateFloorMutation = useMutation({
    mutationFn: ({ id, payload }) => floorService.duplicate(id, payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['building-floors', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      showToast(`Floor duplicated as "${created.name}".`, 'success');
      navigate(`/buildings/${buildingId}/floors/${created.id}`);
    },
  });

  const saveRoomMutation = useMutation({
    mutationFn: ({ roomId, payload }) =>
      roomId ? roomService.update(roomId, payload) : roomService.create(floorId, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['floor-rooms', floorId] });
      queryClient.invalidateQueries({ queryKey: ['building-floors', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      showToast(vars.roomId ? 'Room updated.' : 'Room added.', 'success');
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId) => roomService.remove(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-rooms', floorId] });
      queryClient.invalidateQueries({ queryKey: ['building-floors', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      setDeletingRoom(null);
      showToast('Room deleted.', 'info');
    },
  });

  const reorderRoomMutation = useMutation({
    mutationFn: (roomIds) => roomService.reorder(floorId, roomIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-rooms', floorId] });
    },
  });

  if (floorQuery.isLoading) {
    return (
      <div className="card">
        <LoadingSkeleton lines={5} height={22} />
      </div>
    );
  }

  if (floorQuery.isError) {
    return <ErrorState message={floorQuery.error.message} onRetry={() => floorQuery.refetch()} />;
  }

  const floor = floorQuery.data;
  const rooms = roomsQuery.data || [];
  const roomTypes = roomTypesQuery.data || [];

  const handleMoveRoom = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= rooms.length) return;
    const reordered = [...rooms];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    reorderRoomMutation.mutate(reordered.map((r) => r.id));
  };

  const totalFloorTiles = rooms.reduce((sum, r) => sum + Number(r.floorTileArea || 0), 0);
  const totalWallTiles = rooms.reduce((sum, r) => sum + Number(r.wallTileArea || 0), 0);
  const totalGranite = rooms.reduce((sum, r) => sum + Number(r.graniteArea || 0), 0);
  const totalMeasured = rooms.reduce((sum, r) => sum + Number(r.totalMeasuredArea || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: '0.85rem' }}>
        <Link
          to={buildingId ? `/buildings/${buildingId}` : '/buildings'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.86rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft size={16} /> Back to {floor.buildingName || 'Building'}
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <div>
            <span className="badge badge-primary">Level {floor.floorNumber}</span>
            <h1 className="page-title" style={{ marginTop: '0.35rem' }}>
              {floor.name}
            </h1>
            {floor.notes && <p className="page-subtitle">{floor.notes}</p>}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setEditFloorOpen(true)}
            >
              <Edit2 size={15} /> Edit Floor
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDupFloorOpen(true)}
            >
              <Copy size={15} /> Duplicate
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingRoom(null);
                setRoomModalOpen(true);
              }}
            >
              <Plus size={16} /> Add Room
            </button>
          </div>
        </div>

        {floorSummaryQuery.data ? (
          <AreaSummary summary={floorSummaryQuery.data} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
            <div className="stat-mini">
              <div className="stat-mini-label">Rooms / Areas</div>
              <div className="stat-mini-value">{rooms.length}</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-label">Floor Tiles</div>
              <div className="stat-mini-value">{formatArea(totalFloorTiles)}</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-label">Wall Tiles</div>
              <div className="stat-mini-value">{formatArea(totalWallTiles)}</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-label">Granite</div>
              <div className="stat-mini-value">{formatArea(totalGranite)}</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-label">Total Measured</div>
              <div className="stat-mini-value" style={{ color: 'var(--primary)' }}>
                {formatArea(totalMeasured)}
              </div>
            </div>
          </div>
        )}
      </div>

      {roomsQuery.isLoading ? (
        <LoadingSkeleton lines={4} height={64} />
      ) : roomsQuery.isError ? (
        <ErrorState message={roomsQuery.error.message} onRetry={() => roomsQuery.refetch()} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No rooms or work areas yet"
          description="Add bedrooms, bathrooms, kitchen, hall, staircase, elevation, or custom areas to this floor."
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingRoom(null);
                setRoomModalOpen(true);
              }}
            >
              <Plus size={16} /> Add First Room
            </button>
          }
        />
      ) : (
        <div className="grid-3">
          {rooms.map((room, idx) => (
            <RoomCard
              key={room.id}
              buildingId={buildingId}
              floorId={floorId}
              room={room}
              isFirst={idx === 0}
              isLast={idx === rooms.length - 1}
              onMoveUp={() => handleMoveRoom(idx, -1)}
              onMoveDown={() => handleMoveRoom(idx, 1)}
              onEdit={(r) => {
                setEditingRoom(r);
                setRoomModalOpen(true);
              }}
              onDelete={(r) => setDeletingRoom(r)}
            />
          ))}
        </div>
      )}

      <FloorFormModal
        isOpen={editFloorOpen}
        onClose={() => setEditFloorOpen(false)}
        initialData={floor}
        onSubmit={(values) => updateFloorMutation.mutateAsync(values)}
      />

      <DuplicateFloorModal
        isOpen={dupFloorOpen}
        onClose={() => setDupFloorOpen(false)}
        sourceFloor={floor}
        onSubmit={(id, payload) => duplicateFloorMutation.mutateAsync({ id, payload })}
      />

      <RoomFormModal
        isOpen={roomModalOpen}
        onClose={() => {
          setRoomModalOpen(false);
          setEditingRoom(null);
        }}
        roomTypes={roomTypes}
        existingRooms={rooms}
        initialData={editingRoom}
        onSubmit={(values) =>
          saveRoomMutation.mutateAsync({
            roomId: editingRoom?.id || null,
            payload: values,
          })
        }
      />

      <ConfirmationDialog
        isOpen={Boolean(deletingRoom)}
        onClose={() => setDeletingRoom(null)}
        onConfirm={() => deleteRoomMutation.mutate(deletingRoom.id)}
        title="Delete Room"
        message={`Delete "${deletingRoom?.name}"?`}
        confirmLabel="Delete Room"
        confirmVariant="danger"
        isLoading={deleteRoomMutation.isPending}
      />
    </div>
  );
}

