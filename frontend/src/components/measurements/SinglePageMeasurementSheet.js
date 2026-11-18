import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  Edit2,
  Plus,
  Minus,
  Share2,
  Sparkles,
  Trash2,
  Layers,
  Ruler,
} from 'lucide-react';
import { buildingService } from '../../services/buildingService.js';
import { floorService } from '../../services/floorService.js';
import { roomService } from '../../services/roomService.js';
import { measurementService } from '../../services/measurementService.js';
import { useUI } from '../../context/UIContext.js';
import { calculateMeasurementPreview } from '../../utils/measurementCalculator.js';
import { formatArea } from '../../utils/formatters.js';
import { shareMeasurementsOnWhatsApp } from '../../utils/measurementPdfExport.js';
import Modal from '../common/Modal.js';
import MeasurementFormModal from './MeasurementFormModal.js';
import StaircaseFormModal from './StaircaseFormModal.js';
import ConfirmationDialog from '../common/ConfirmationDialog.js';
import LoadingSkeleton from '../common/LoadingSkeleton.js';

const QUICK_WORK_CODES = [
  'FLOOR_TILES',
  'WALL_TILES',
  'PARKING_TILES',
  'KITCHEN_GRANITE_PLATFORM',
  'SKIRTING',
  'GRANITE_STAIRCASE',
];

const STANDARD_ROOM_PRESETS = [
  'Hall',
  'Master Bedroom',
  'Master Bathroom',
  'Children Bedroom',
  'Children Bathroom',
  'Kitchen',
  'Parking',
  'Balcony',
  'Pooja Room',
  'Dining',
  'Outside Bathroom',
  'Terrace',
];

const ROOM_PRESETS = STANDARD_ROOM_PRESETS;

const STANDARD_ROOM_DEFAULTS = {
  hall: { length: 10, width: 10 },
  kitchen: { length: 10, width: 12 },
  'master bedroom': { length: 10, width: 12 },
  'master bathroom': { length: 5, width: 8 },
  'children bedroom': { length: 10, width: 12 },
  'children bathroom': { length: 5, width: 7 },
  parking: { length: 12, width: 16 },
  balcony: { length: 5, width: 10 },
  'pooja room': { length: 6, width: 6 },
  dining: { length: 10, width: 10 },
  'outside bathroom': { length: 4, width: 5 },
  terrace: { length: 15, width: 20 },
};

const FLOOR_PRESETS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', 'Terrace'];

function getOutputUnitLabel(unit) {
  if (unit === 'SQ_FT') return 'sq ft';
  if (unit === 'RUNNING_FT') return 'rft';
  if (unit === 'PIECES') return 'pcs';
  return 'fixed';
}

function resolveWorkType(surfaceKey, workTypes = []) {
  if (surfaceKey === 'FLOOR_TILES') {
    return (
      workTypes.find((w) => w.code === 'FLOOR_TILES') ||
      workTypes.find((w) => w.name?.toLowerCase()?.includes('floor')) ||
      workTypes[0]
    );
  }
  if (surfaceKey === 'WALL_TILES') {
    return (
      workTypes.find((w) => w.code === 'WALL_TILES') ||
      workTypes.find((w) => w.name?.toLowerCase()?.includes('wall')) ||
      workTypes[0]
    );
  }
  return (
    workTypes.find((w) => w.code === 'CUSTOM_WORK') ||
    workTypes.find((w) => w.name?.toLowerCase()?.includes('custom')) ||
    workTypes.find((w) => w.code === 'OTHER') ||
    workTypes[0]
  );
}

function formatDimensionDisplay(val) {
  if (!val && val !== 0) return '—';
  const str = String(val).trim();
  if (str.includes("'") || str.includes('"')) return str;
  const num = Number(str);
  if (!isNaN(num) && num > 0) {
    const feet = Math.floor(num);
    const inches = Math.round((num - feet) * 12);
    if (inches === 12) return `${feet + 1}' 0"`;
    return `${feet}' ${inches}"`;
  }
  return str || '—';
}

function parseDimensionToNumber(val) {
  if (val === undefined || val === null) return 0;
  let str = String(val).trim().replace(/ft$/i, '').trim();
  if (!str) return 0;

  // Handle feet & inches formats like 10' 6", 10' 6, 10'
  const match = str.match(/^(\d+(?:\.\d+)?)\s*'(?:\s*(\d+(?:\.\d+)?))?/);
  if (match) {
    const feet = parseFloat(match[1]) || 0;
    const inches = parseFloat(match[2]) || 0;
    return feet + inches / 12;
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function stepDimension(currentVal, delta) {
  const num = parseDimensionToNumber(currentVal);
  const next = Math.max(0, Math.round((num + delta) * 2) / 2);
  return String(next);
}

function getRoomDisplayData(room) {
  const meas = room.measurements || [];
  const floorMeasList = meas.filter((m) => m.surfaceRole === 'FLOOR' || m.workTypeCode === 'FLOOR_TILES');
  const wallMeasList = meas.filter((m) => m.surfaceRole === 'WALL' || m.workTypeCode === 'WALL_TILES');
  const otherMeasList = meas.filter(
    (m) =>
      m.surfaceRole !== 'FLOOR' &&
      m.surfaceRole !== 'WALL' &&
      m.workTypeCode !== 'FLOOR_TILES' &&
      m.workTypeCode !== 'WALL_TILES'
  );

  const floorMeas = floorMeasList[0] || meas[0];
  const defaults = STANDARD_ROOM_DEFAULTS[room.name?.toLowerCase()?.trim()] || null;

  let widthVal = floorMeas?.widthRaw || floorMeas?.heightRaw || floorMeas?.widthFt || floorMeas?.heightFt;
  let lengthVal = floorMeas?.lengthRaw || floorMeas?.lengthFt;

  if (!widthVal && defaults?.width) widthVal = defaults.width;
  if (!lengthVal && defaults?.length) lengthVal = defaults.length;

  const floorArea =
    floorMeasList.reduce((acc, m) => acc + Number(m.netArea || 0), 0) || Number(room.floorTileArea || 0);
  const wallArea =
    wallMeasList.reduce((acc, m) => acc + Number(m.netArea || 0), 0) || Number(room.wallTileArea || 0);
  const otherArea = otherMeasList.reduce((acc, m) => acc + Number(m.netArea || 0), 0);

  let totalArea = Math.round(floorArea + wallArea + otherArea || Number(room.totalMeasuredArea || 0));
  if (totalArea <= 0 && widthVal && lengthVal && !isNaN(Number(widthVal)) && !isNaN(Number(lengthVal))) {
    totalArea = Math.round(Number(widthVal) * Number(lengthVal));
  } else if (totalArea <= 0 && floorMeas?.netArea) {
    totalArea = Math.round(Number(floorMeas.netArea));
  }

  return {
    widthFormatted: formatDimensionDisplay(widthVal),
    lengthFormatted: formatDimensionDisplay(lengthVal),
    widthRaw: widthVal ? String(widthVal) : '',
    lengthRaw: lengthVal ? String(lengthVal) : '',
    area: totalArea,
    totalArea,
    floorArea: Math.round(floorArea),
    wallArea: Math.round(wallArea),
    otherArea: Math.round(otherArea),
    measurementCount: meas.length,
    meas,
    floorMeas,
    floorMeasList,
    wallMeasList,
    otherMeasList,
  };
}

export default function SinglePageMeasurementSheet({ buildingId, building, workTypes = [] }) {
  const queryClient = useQueryClient();
  const { showToast } = useUI();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Floor Selection
  const [activeFloorId, setActiveFloorId] = useState('');

  // Modals & Dialogs
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [staircaseOpen, setStaircaseOpen] = useState(false);
  const [customFloorModalOpen, setCustomFloorModalOpen] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');

  // Add Room Modal State
  const [customRoomFloorId, setCustomRoomFloorId] = useState(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomWidth, setNewRoomWidth] = useState('');
  const [newRoomLength, setNewRoomLength] = useState('');
  const [newRoomSurface, setNewRoomSurface] = useState('FLOOR_TILES');
  const [newRoomCustomName, setNewRoomCustomName] = useState('');
  const [newRoomError, setNewRoomError] = useState('');
  const [isAddingRoom, setIsAddingRoom] = useState(false);

  const [deletingFloor, setDeletingFloor] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [editingMeasurement, setEditingMeasurement] = useState(null);
  const [deletingMeasurement, setDeletingMeasurement] = useState(null);

  // Selected Room for Adjusting Dimensions Modal
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editRoomName, setEditRoomName] = useState('');
  const [editWidth, setEditWidth] = useState('');
  const [editLength, setEditLength] = useState('');
  const [editSurface, setEditSurface] = useState('FLOOR_TILES');
  const [editCustomName, setEditCustomName] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingRoom, setIsSavingRoom] = useState(false);

  // Fetch full building tree (floors -> rooms -> measurements)
  const treeQuery = useQuery({
    queryKey: ['building-tree', buildingId],
    queryFn: () => buildingService.getTree(buildingId),
  });

  const tree = treeQuery.data || { building: null, floors: [] };
  const floors = tree.floors || [];

  // Sync active floor selection
  useEffect(() => {
    if (floors.length === 0) {
      setActiveFloorId('');
      return;
    }
    if (!activeFloorId || !floors.some((f) => f.id === activeFloorId)) {
      setActiveFloorId(floors[0].id);
    }
  }, [floors, activeFloorId]);

  const activeFloor = useMemo(() => {
    return floors.find((f) => f.id === activeFloorId) || floors[0] || null;
  }, [floors, activeFloorId]);

  const activeFloorRooms = useMemo(() => {
    return activeFloor?.rooms || [];
  }, [activeFloor]);

  // Total area for active floor overview
  const activeFloorTotalArea = useMemo(() => {
    return activeFloorRooms.reduce((acc, r) => {
      const { area } = getRoomDisplayData(r);
      return acc + area;
    }, 0);
  }, [activeFloorRooms]);

  // Total building measured area
  const totalBuildingMeasuredArea = useMemo(() => {
    return floors.reduce(
      (acc, f) => acc + Number(f.totalMeasuredArea || 0),
      0
    );
  }, [floors]);

  // Invalidate queries helper
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['building-tree', buildingId] });
    queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
    queryClient.invalidateQueries({ queryKey: ['building-summary', buildingId] });
    queryClient.invalidateQueries({ queryKey: ['buildings'] });
  };

  // Mutations
  const initLayoutMutation = useMutation({
    mutationFn: (layout) => buildingService.initLayout(buildingId, layout),
    onSuccess: () => {
      invalidateAll();
      showToast('Standard floors and rooms layout initialized.', 'success');
    },
    onError: (err) => showToast(err.message || 'Layout setup failed', 'error'),
  });

  const addFloorMutation = useMutation({
    mutationFn: (name) =>
      floorService.create(buildingId, {
        name,
        floorNumber: floors.length,
      }),
    onSuccess: (newFloor) => {
      invalidateAll();
      setActiveFloorId(newFloor.id);
      setCustomFloorModalOpen(false);
      setNewFloorName('');
      showToast(`Floor "${newFloor.name}" added.`, 'success');
    },
    onError: (err) => showToast(err.message || 'Failed to add floor', 'error'),
  });

  const deleteFloorMutation = useMutation({
    mutationFn: (floorId) => floorService.remove(floorId),
    onSuccess: () => {
      invalidateAll();
      setDeletingFloor(null);
      showToast('Floor removed.', 'info');
    },
    onError: (err) => showToast(err.message || 'Failed to delete floor', 'error'),
  });

  const duplicateFloorMutation = useMutation({
    mutationFn: ({ floorId, name }) =>
      floorService.duplicate(floorId, { name, copyMeasurements: true }),
    onSuccess: (created) => {
      invalidateAll();
      setActiveFloorId(created.id);
      showToast(`Floor duplicated as "${created.name}".`, 'success');
    },
    onError: (err) => showToast(err.message || 'Duplication failed', 'error'),
  });

  const addRoomMutation = useMutation({
    mutationFn: ({ floorId, name }) => roomService.create(floorId, { name }),
    onSuccess: (newRoom) => {
      invalidateAll();
      setCustomRoomFloorId(null);
      setNewRoomName('');
      showToast(`Room "${newRoom.name}" added.`, 'success');
    },
    onError: (err) => showToast(err.message || 'Failed to add room', 'error'),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId) => roomService.remove(roomId),
    onSuccess: () => {
      invalidateAll();
      setSelectedRoom(null);
      setDeletingRoom(null);
      showToast('Room deleted.', 'info');
    },
    onError: (err) => showToast(err.message || 'Failed to delete room', 'error'),
  });

  const addMeasurementMutation = useMutation({
    mutationFn: ({ roomId, payload }) => measurementService.create(roomId, payload),
    onSuccess: () => {
      invalidateAll();
      showToast('Measurement saved.', 'success');
    },
    onError: (err) => showToast(err.message || 'Save failed', 'error'),
  });

  const updateMeasurementMutation = useMutation({
    mutationFn: ({ id, payload }) => measurementService.update(id, payload),
    onSuccess: () => {
      invalidateAll();
      showToast('Measurement updated.', 'success');
    },
    onError: (err) => showToast(err.message || 'Update failed', 'error'),
  });

  const deleteMeasurementMutation = useMutation({
    mutationFn: (id) => measurementService.remove(id),
    onSuccess: () => {
      invalidateAll();
      setDeletingMeasurement(null);
      showToast('Measurement removed.', 'info');
    },
    onError: (err) => showToast(err.message || 'Delete failed', 'error'),
  });

  // Add Room Modal Helpers
  const openAddRoomModal = (floorId) => {
    setCustomRoomFloorId(floorId);
    setNewRoomName('');
    setNewRoomWidth('');
    setNewRoomLength('');
    setNewRoomSurface('FLOOR_TILES');
    setNewRoomCustomName('');
    setNewRoomError('');
  };

  const handleSelectRoomPreset = (presetName) => {
    setNewRoomName(presetName);
    const def = STANDARD_ROOM_DEFAULTS[presetName.toLowerCase().trim()];
    if (def) {
      setNewRoomWidth(String(def.width));
      setNewRoomLength(String(def.length));
    }
  };

  const newRoomPreviewArea = useMemo(() => {
    if (!newRoomLength || !newRoomWidth) return null;
    const res = calculateMeasurementPreview({
      inputMethod: 'DIMENSIONS',
      dimensionUnit: 'DECIMAL_FEET',
      outputUnit: 'SQ_FT',
      lengthRaw: newRoomLength,
      widthRaw: newRoomWidth,
      quantity: 1,
      segments: [],
      deductions: [],
    });
    return res && !res.error && res.netArea ? Math.round(res.netArea) : null;
  }, [newRoomLength, newRoomWidth]);

  const handleCreateRoomWithDimensions = async (e) => {
    e?.preventDefault();
    if (!customRoomFloorId || !newRoomName.trim()) return;
    setNewRoomError('');
    setIsAddingRoom(true);

    try {
      const createdRoom = await roomService.create(customRoomFloorId, { name: newRoomName.trim() });

      if (newRoomWidth.trim() && newRoomLength.trim()) {
        let availableWorkTypes = workTypes;
        if (!availableWorkTypes || availableWorkTypes.length === 0) {
          try {
            availableWorkTypes = await measurementService.listWorkTypes();
          } catch (wtErr) {
            console.error('Failed to fetch work types:', wtErr);
          }
        }

        const wt = resolveWorkType(newRoomSurface, availableWorkTypes);
        const role = newRoomSurface === 'WALL_TILES' ? 'WALL' : newRoomSurface === 'CUSTOM' ? 'OTHER' : 'FLOOR';
        const surfaceLabel =
          newRoomSurface === 'CUSTOM' && newRoomCustomName.trim()
            ? newRoomCustomName.trim()
            : newRoomSurface === 'WALL_TILES'
              ? 'Wall Tiles'
              : newRoomSurface === 'CUSTOM'
                ? 'Custom Work'
                : 'Floor Tiles';

        await measurementService.create(createdRoom.id, {
          workTypeId: wt?.id,
          name: `${createdRoom.name} ${surfaceLabel}`,
          inputMethod: 'DIMENSIONS',
          dimensionUnit: 'DECIMAL_FEET',
          outputUnit: wt?.defaultUnit || 'SQ_FT',
          surfaceRole: role,
          lengthRaw: newRoomLength.trim(),
          widthRaw: newRoomWidth.trim(),
          heightRaw: null,
          quantity: 1,
          segments: [],
          deductions: [],
        });
      }

      invalidateAll();
      setCustomRoomFloorId(null);
      setNewRoomName('');
      setNewRoomWidth('');
      setNewRoomLength('');
      setNewRoomSurface('FLOOR_TILES');
      setNewRoomCustomName('');
      showToast(`Room "${createdRoom.name}" added successfully.`, 'success');
    } catch (err) {
      setNewRoomError(err.message || 'Failed to add room');
    } finally {
      setIsAddingRoom(false);
    }
  };

  // When selectedRoom changes, initialize modal fields
  useEffect(() => {
    if (!selectedRoom) return;
    const { widthRaw, lengthRaw, floorMeas } = getRoomDisplayData(selectedRoom);
    setEditRoomName(selectedRoom.name || '');
    setEditWidth(widthRaw);
    setEditLength(lengthRaw);
    setEditError('');

    let currentSurface = 'FLOOR_TILES';
    if (floorMeas?.surfaceRole === 'WALL' || floorMeas?.workTypeCode === 'WALL_TILES') {
      currentSurface = 'WALL_TILES';
    } else if (floorMeas?.surfaceRole === 'OTHER' || floorMeas?.workTypeCode === 'CUSTOM_WORK') {
      currentSurface = 'CUSTOM';
    }
    setEditSurface(currentSurface);
    setEditCustomName(
      floorMeas?.name ? floorMeas.name.replace(selectedRoom.name || '', '').trim() : ''
    );
  }, [selectedRoom, workTypes]);

  // When surface is toggled in edit room modal, switch to existing dimensions for that surface if available
  const handleSelectEditSurface = (surfaceKey) => {
    setEditSurface(surfaceKey);
    if (!selectedRoom) return;

    const measList = selectedRoom.measurements || [];
    const targetMeas = measList.find((m) => {
      if (surfaceKey === 'WALL_TILES') return m.surfaceRole === 'WALL' || m.workTypeCode === 'WALL_TILES';
      if (surfaceKey === 'CUSTOM') return m.surfaceRole === 'OTHER' || m.workTypeCode === 'CUSTOM_WORK';
      return m.surfaceRole === 'FLOOR' || m.workTypeCode === 'FLOOR_TILES';
    });

    if (targetMeas) {
      setEditWidth(String(targetMeas.widthRaw || targetMeas.widthFt || ''));
      setEditLength(String(targetMeas.lengthRaw || targetMeas.lengthFt || ''));
      if (surfaceKey === 'CUSTOM') {
        setEditCustomName(targetMeas.name ? targetMeas.name.replace(selectedRoom.name || '', '').trim() : '');
      }
    }
  };

  // Selected work type for edit room modal
  const selectedEditWorkType = useMemo(() => {
    return resolveWorkType(editSurface, workTypes);
  }, [workTypes, editSurface]);

  // Live preview area for edit room modal
  const editPreview = useMemo(() => {
    if (!selectedEditWorkType || !editLength || !editWidth) return null;
    return calculateMeasurementPreview({
      inputMethod: 'DIMENSIONS',
      dimensionUnit: 'DECIMAL_FEET',
      outputUnit: selectedEditWorkType.defaultUnit || 'SQ_FT',
      lengthRaw: editLength,
      widthRaw: editWidth,
      quantity: 1,
      segments: [],
      deductions: [],
    });
  }, [selectedEditWorkType, editLength, editWidth]);

  // Handle Save Dimensions from the Room Modal
  const handleSaveRoomDimensions = async (e) => {
    e?.preventDefault();
    if (!selectedRoom) return;
    setEditError('');

    if (!editLength.trim() || !editWidth.trim()) {
      setEditError('Please enter both width and length.');
      return;
    }

    setIsSavingRoom(true);
    const { floorMeas } = getRoomDisplayData(selectedRoom);
    const wt = selectedEditWorkType;
    const role = editSurface === 'WALL_TILES' ? 'WALL' : editSurface === 'CUSTOM' ? 'OTHER' : 'FLOOR';
    const surfaceLabel =
      editSurface === 'CUSTOM' && editCustomName.trim()
        ? editCustomName.trim()
        : editSurface === 'WALL_TILES'
          ? 'Wall Tiles'
          : editSurface === 'CUSTOM'
            ? 'Custom Work'
            : 'Floor Tiles';

    const payload = {
      workTypeId: wt?.id,
      name: `${editRoomName.trim() || selectedRoom.name} ${surfaceLabel}`,
      inputMethod: 'DIMENSIONS',
      dimensionUnit: 'DECIMAL_FEET',
      outputUnit: wt?.defaultUnit || 'SQ_FT',
      surfaceRole: role,
      lengthRaw: editLength.trim(),
      widthRaw: editWidth.trim(),
      heightRaw: null,
      quantity: 1,
      segments: [],
      deductions: [],
    };

    try {
      // If room name changed, update room name
      if (editRoomName.trim() && editRoomName.trim() !== selectedRoom.name) {
        await roomService.update(selectedRoom.id, { name: editRoomName.trim() });
      }

      const existingMeasForSurface = (selectedRoom.measurements || []).find((m) => {
        if (editSurface === 'WALL_TILES') return m.surfaceRole === 'WALL' || m.workTypeCode === 'WALL_TILES';
        if (editSurface === 'CUSTOM') return m.surfaceRole === 'OTHER' || m.workTypeCode === 'CUSTOM_WORK';
        return m.surfaceRole === 'FLOOR' || m.workTypeCode === 'FLOOR_TILES';
      });

      if (existingMeasForSurface?.id) {
        await updateMeasurementMutation.mutateAsync({ id: existingMeasForSurface.id, payload });
      } else {
        await addMeasurementMutation.mutateAsync({ roomId: selectedRoom.id, payload });
      }

      setSelectedRoom(null);
      showToast(`Updated ${editRoomName.trim() || selectedRoom.name} dimensions.`, 'success');
    } catch (err) {
      setEditError(err.message || 'Failed to save dimensions');
    } finally {
      setIsSavingRoom(false);
    }
  };

  // WhatsApp share
  const handleSharePdf = async () => {
    if (floors.length === 0) {
      showToast('No floors or measurements to share yet.', 'warning');
      return;
    }
    setIsSharingPdf(true);
    try {
      await shareMeasurementsOnWhatsApp({
        building: building || tree.building,
        floors,
        totalArea: totalBuildingMeasuredArea,
        showToast,
      });
    } catch (err) {
      console.error('Share failed:', err);
      showToast('Failed to share PDF. Please try again.', 'error');
    } finally {
      setIsSharingPdf(false);
    }
  };

  if (treeQuery.isLoading) {
    return <LoadingSkeleton lines={6} height={70} />;
  }

  if (treeQuery.isError) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '1.5rem', margin: '0.5rem 0' }}>
        <p style={{ color: 'var(--danger)', fontSize: '0.86rem', margin: '0 0 0.8rem' }}>
          {treeQuery.error?.message || 'Failed to load building measurements.'}
        </p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => treeQuery.refetch()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {/* 1. Empty State if 0 floors */}
      {floors.length === 0 && (
        <div
          className="card"
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.65rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Layers size={32} color="var(--primary)" />
          <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#ffffff' }}>
            No floors in this building yet
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem', maxWidth: 360 }}>
            Start by adding a floor level. You can choose from presets like Ground Floor or enter a custom name.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ padding: '0.45rem 1rem', fontSize: '0.84rem' }}
            onClick={() => setCustomFloorModalOpen(true)}
          >
            <Plus size={14} /> Add Floor
          </button>
        </div>
      )}

      {/* 2. Floor Switcher & Action Toolbar */}
      {floors.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Floor selection tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            {floors.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`btn btn-sm ${activeFloorId === f.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.78rem',
                  minHeight: 28,
                  padding: '0.2rem 0.65rem',
                  fontWeight: activeFloorId === f.id ? 700 : 500,
                }}
                onClick={() => setActiveFloorId(f.id)}
              >
                {f.name} ({f.rooms?.length || 0})
              </button>
            ))}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.76rem', minHeight: 28, padding: '0.2rem 0.55rem' }}
              onClick={() => setCustomFloorModalOpen(true)}
              title="Add New Floor"
            >
              <Plus size={13} /> Floor
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.76rem', minHeight: 28, padding: '0.2rem 0.55rem' }}
              onClick={() => openAddRoomModal(activeFloorId)}
              disabled={!activeFloorId}
              title="Add Room to Active Floor"
            >
              <Plus size={13} /> Add Room
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.76rem', minHeight: 28, padding: '0.2rem 0.55rem' }}
              onClick={() => setStaircaseOpen(true)}
              title="Staircase Calculator"
            >
              <Ruler size={13} /> Staircase
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.76rem', minHeight: 28, padding: '0.2rem 0.55rem' }}
              onClick={handleSharePdf}
              disabled={isSharingPdf || floors.length === 0}
              title="Share PDF via WhatsApp"
            >
              <Share2 size={13} color="var(--primary)" /> {isSharingPdf ? 'Sharing...' : 'Share PDF'}
            </button>

            {activeFloor && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.76rem', minHeight: 28, padding: '0.2rem 0.45rem', color: '#f87171' }}
                onClick={() => setDeletingFloor(activeFloor)}
                title={`Delete ${activeFloor.name}`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. The Exact Room Dimensions Overview Card (Matches User Request) */}
      {floors.length > 0 && activeFloor && (
        <div
          className="card"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Card Header: Room Dimensions Overview ({count} Rooms):     Total: {totalArea} sq ft */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '0.25rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff' }}>
              Room Dimensions Overview ({activeFloorRooms.length} Rooms):
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
              Total: {activeFloorTotalArea} sq ft
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
            Click any room to view or adjust width and length
          </div>

          {/* Vertical Stack of Room Cards */}
          {activeFloorRooms.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <div>No rooms on {activeFloor.name} yet.</div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                onClick={() => openAddRoomModal(activeFloor.id)}
              >
                <Plus size={13} /> Add Room
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {activeFloorRooms.map((room) => {
                const {
                  widthFormatted,
                  lengthFormatted,
                  totalArea,
                  floorArea,
                  wallArea,
                  meas,
                } = getRoomDisplayData(room);

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    style={{
                      cursor: 'pointer',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(30, 41, 59, 0.55)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease',
                    }}
                    className="room-dimension-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                        {room.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {floorArea > 0 && wallArea > 0 ? (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>F: {floorArea}</span> •{' '}
                            <span style={{ color: '#38bdf8', fontWeight: 700 }}>W: {wallArea}</span>{' '}
                            <strong style={{ color: '#ffffff' }}>({totalArea} sq ft)</strong>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                            {totalArea} sq ft
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Surface Measurements Breakdown (Floor Tiles, Wall Tiles, Custom) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {meas && meas.length > 0 ? (
                        meas.map((m) => {
                          const isWall = m.surfaceRole === 'WALL' || m.workTypeCode === 'WALL_TILES';
                          const isCustom = m.surfaceRole === 'OTHER' || m.workTypeCode === 'CUSTOM_WORK';
                          const label = isWall
                            ? 'Wall Tiles'
                            : isCustom
                              ? m.name?.replace(room.name, '').trim() || 'Custom'
                              : 'Floor Tiles';
                          const tagColor = isWall ? '#38bdf8' : isCustom ? '#c084fc' : 'var(--primary)';
                          const tagBg = isWall
                            ? 'rgba(56, 189, 248, 0.12)'
                            : isCustom
                              ? 'rgba(192, 132, 252, 0.12)'
                              : 'rgba(20, 184, 166, 0.12)';
                          const tagBorder = isWall
                            ? 'rgba(56, 189, 248, 0.3)'
                            : isCustom
                              ? 'rgba(192, 132, 252, 0.3)'
                              : 'rgba(20, 184, 166, 0.3)';

                          const widthStr = formatDimensionDisplay(m.widthRaw || m.widthFt || m.heightRaw);
                          const lengthStr = formatDimensionDisplay(m.lengthRaw || m.lengthFt);
                          const mArea = m.netArea ? Math.round(m.netArea) : 0;

                          return (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(15, 23, 42, 0.45)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.78rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '0.12rem 0.4rem',
                                    borderRadius: 4,
                                    background: tagBg,
                                    color: tagColor,
                                    border: `1px solid ${tagBorder}`,
                                    letterSpacing: '0.02em',
                                  }}
                                >
                                  {label}
                                </span>
                                <span style={{ color: '#94a3b8' }}>
                                  Width: <strong style={{ color: '#f1f5f9', fontWeight: 700 }}>{widthStr}</strong> • Length:{' '}
                                  <strong style={{ color: '#f1f5f9', fontWeight: 700 }}>{lengthStr}</strong>
                                </span>
                              </div>
                              {mArea > 0 && (
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: tagColor, fontFamily: 'monospace' }}>
                                  {mArea} sq ft
                                </span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(15, 23, 42, 0.45)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '0.12rem 0.4rem',
                                borderRadius: 4,
                                background: 'rgba(20, 184, 166, 0.12)',
                                color: 'var(--primary)',
                                border: '1px solid rgba(20, 184, 166, 0.3)',
                              }}
                            >
                              Floor Tiles
                            </span>
                            <span style={{ color: '#94a3b8' }}>
                              Width: <strong style={{ color: '#f1f5f9', fontWeight: 700 }}>{widthFormatted}</strong> • Length:{' '}
                              <strong style={{ color: '#f1f5f9', fontWeight: 700 }}>{lengthFormatted}</strong>
                            </span>
                          </div>
                          {totalArea > 0 && (
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                              {totalArea} sq ft
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Adjust Room Dimensions Modal (Opens on Room Click) */}
      {selectedRoom && (
        <Modal
          isOpen={Boolean(selectedRoom)}
          onClose={() => setSelectedRoom(null)}
          title={`Adjust Room Dimensions — ${selectedRoom.name}`}
          maxWidth={480}
        >
          <form onSubmit={handleSaveRoomDimensions}>
            {editError && (
              <div className="alert alert-error" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem' }}>
                {editError}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '0.65rem' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>
                Room / Area Name
              </label>
              <input
                type="text"
                className="form-input"
                style={{ minHeight: 36, fontSize: '0.88rem' }}
                value={editRoomName}
                onChange={(e) => setEditRoomName(e.target.value)}
                placeholder="e.g. Hall, Master Bedroom, Kitchen..."
              />
            </div>

            {/* Width and Length in ONE LINE with High-End Stepper UI */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.65rem',
                marginBottom: '0.85rem',
              }}
            >
              {/* Width Stepper Card */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.55rem 0.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Width
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    ±0.5 ft
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditWidth((prev) => stepDimension(prev, -0.5))}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(51, 65, 85, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Decrease width by 0.5 ft"
                  >
                    <Minus size={14} />
                  </button>

                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editWidth}
                      onChange={(e) => setEditWidth(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        height: 34,
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        padding: '0 1.2rem 0 0.4rem',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: '0.35rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none',
                      }}
                    >
                      ft
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditWidth((prev) => stepDimension(prev, 0.5))}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary)',
                      border: '1px solid var(--primary)',
                      color: '#042f2e',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Increase width by 0.5 ft"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Length Stepper Card */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.55rem 0.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Length
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    ±0.5 ft
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditLength((prev) => stepDimension(prev, -0.5))}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(51, 65, 85, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Decrease length by 0.5 ft"
                  >
                    <Minus size={14} />
                  </button>

                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editLength}
                      onChange={(e) => setEditLength(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        height: 34,
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        padding: '0 1.2rem 0 0.4rem',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: '0.35rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none',
                      }}
                    >
                      ft
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditLength((prev) => stepDimension(prev, 0.5))}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary)',
                      border: '1px solid var(--primary)',
                      color: '#042f2e',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Increase length by 0.5 ft"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Surface or Work Type Selection (strictly Floor Tiles, Wall Tiles, Custom) */}
            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.4rem' }}>
                Surface or Work Type
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {[
                  { key: 'FLOOR_TILES', label: 'Floor Tiles' },
                  { key: 'WALL_TILES', label: 'Wall Tiles' },
                  { key: 'CUSTOM', label: 'Custom' },
                ].map((st) => {
                  const isSelected = editSurface === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => handleSelectEditSurface(st.key)}
                      style={{
                        fontSize: '0.78rem',
                        padding: '0.38rem 0.85rem',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-full)',
                        background: isSelected ? 'var(--primary)' : 'rgba(30, 41, 59, 0.65)',
                        color: isSelected ? '#042f2e' : '#e2e8f0',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.12)',
                        fontWeight: isSelected ? 700 : 500,
                        boxShadow: isSelected ? '0 2px 8px rgba(20, 184, 166, 0.35)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {editSurface === 'CUSTOM' && (
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>
                  Custom Surface / Work Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 36, fontSize: '0.88rem' }}
                  value={editCustomName}
                  onChange={(e) => setEditCustomName(e.target.value)}
                  placeholder="e.g. Skirting, Granite Border, Balcony Cladding..."
                />
              </div>
            )}

            {/* Live Calculated Area Preview Banner */}
            {editPreview && editPreview.netArea > 0 && (
              <div
                style={{
                  background: 'rgba(20, 184, 166, 0.12)',
                  border: '1px solid rgba(20, 184, 166, 0.35)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Calculated Area:</span>
                <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                  {Math.round(editPreview.netArea)} sq ft
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setDeletingRoom(selectedRoom)}
                disabled={isSavingRoom || deleteRoomMutation.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Trash2 size={13} /> Delete Room
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedRoom(null)}
                  disabled={isSavingRoom}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSavingRoom || !editLength.trim() || !editWidth.trim()}
                >
                  {isSavingRoom ? 'Saving...' : 'Save Dimensions'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* 5. Custom Floor Modal */}
      {customFloorModalOpen && (
        <Modal
          isOpen={customFloorModalOpen}
          onClose={() => setCustomFloorModalOpen(false)}
          title="Add New Floor Level"
          maxWidth={440}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newFloorName.trim()) {
                addFloorMutation.mutate(newFloorName.trim());
              }
            }}
          >
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Floor Name</label>
              <input
                type="text"
                className="form-input"
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                placeholder="e.g. Ground Floor, 1st Floor, Terrace..."
              />
            </div>

            <div>
              <div className="muted" style={{ fontSize: '0.78rem', marginBottom: '0.45rem' }}>
                Quick options:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {FLOOR_PRESETS.map((preset) => {
                  const isSelected = newFloorName.trim().toLowerCase() === preset.toLowerCase();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewFloorName(preset)}
                      style={{
                        fontSize: '0.78rem',
                        padding: '0.35rem 0.75rem',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-full)',
                        background: isSelected ? 'var(--primary)' : 'rgba(30, 41, 59, 0.65)',
                        color: isSelected ? '#042f2e' : '#e2e8f0',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.12)',
                        fontWeight: isSelected ? 700 : 500,
                        boxShadow: isSelected ? '0 2px 8px rgba(20, 184, 166, 0.35)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCustomFloorModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newFloorName.trim() || addFloorMutation.isPending}
              >
                {addFloorMutation.isPending ? 'Adding...' : 'Add Floor'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 6. Custom Room Modal */}
      {Boolean(customRoomFloorId) && (
        <Modal
          isOpen={Boolean(customRoomFloorId)}
          onClose={() => setCustomRoomFloorId(null)}
          title="Add New Room"
          maxWidth={480}
        >
          <form onSubmit={handleCreateRoomWithDimensions}>
            {newRoomError && (
              <div className="alert alert-error" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem' }}>
                {newRoomError}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Room / Area Name</label>
              <input
                type="text"
                className="form-input"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="e.g. Hall, Master Bedroom, Kitchen..."
              />
            </div>

            {/* Quick Room Presets */}
            <div style={{ marginBottom: '0.85rem' }}>
              <div className="muted" style={{ fontSize: '0.76rem', marginBottom: '0.4rem' }}>
                Quick options (tap to select &amp; fill standard dimensions):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {ROOM_PRESETS.map((p) => {
                  const isSelected = newRoomName.trim().toLowerCase() === p.toLowerCase();
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSelectRoomPreset(p)}
                        style={{
                          fontSize: '0.76rem',
                          padding: '0.3rem 0.65rem',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-full)',
                          background: isSelected ? 'var(--primary)' : 'rgba(30, 41, 59, 0.65)',
                          color: isSelected ? '#042f2e' : '#e2e8f0',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.12)',
                          fontWeight: isSelected ? 700 : 500,
                          boxShadow: isSelected ? '0 2px 8px rgba(20, 184, 166, 0.35)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Width and Length in ONE LINE with High-End Stepper UI */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.65rem',
                marginBottom: '0.85rem',
              }}
            >
              {/* Width Stepper Card */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.55rem 0.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Width
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    ±0.5 ft
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewRoomWidth((prev) => stepDimension(prev, -0.5))}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(51, 65, 85, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Decrease width by 0.5 ft"
                  >
                    <Minus size={14} />
                  </button>

                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newRoomWidth}
                      onChange={(e) => setNewRoomWidth(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        height: 34,
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        padding: '0 1.2rem 0 0.4rem',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: '0.35rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none',
                      }}
                    >
                      ft
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewRoomWidth((prev) => stepDimension(prev, 0.5))}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary)',
                      border: '1px solid var(--primary)',
                      color: '#042f2e',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Increase width by 0.5 ft"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Length Stepper Card */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.55rem 0.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Length
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    ±0.5 ft
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewRoomLength((prev) => stepDimension(prev, -0.5))}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(51, 65, 85, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Decrease length by 0.5 ft"
                  >
                    <Minus size={14} />
                  </button>

                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newRoomLength}
                      onChange={(e) => setNewRoomLength(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        height: 34,
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        padding: '0 1.2rem 0 0.4rem',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: '0.35rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none',
                      }}
                    >
                      ft
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewRoomLength((prev) => stepDimension(prev, 0.5))}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary)',
                      border: '1px solid var(--primary)',
                      color: '#042f2e',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Increase length by 0.5 ft"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Surface or Work Type Selection (strictly Floor Tiles, Wall Tiles, Custom) */}
            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.4rem' }}>
                Surface or Work Type
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {[
                  { key: 'FLOOR_TILES', label: 'Floor Tiles' },
                  { key: 'WALL_TILES', label: 'Wall Tiles' },
                  { key: 'CUSTOM', label: 'Custom' },
                ].map((st) => {
                  const isSelected = newRoomSurface === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setNewRoomSurface(st.key)}
                      style={{
                        fontSize: '0.78rem',
                        padding: '0.38rem 0.85rem',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-full)',
                        background: isSelected ? 'var(--primary)' : 'rgba(30, 41, 59, 0.65)',
                        color: isSelected ? '#042f2e' : '#e2e8f0',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.12)',
                        fontWeight: isSelected ? 700 : 500,
                        boxShadow: isSelected ? '0 2px 8px rgba(20, 184, 166, 0.35)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {newRoomSurface === 'CUSTOM' && (
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>
                  Custom Surface / Work Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 36, fontSize: '0.88rem' }}
                  value={newRoomCustomName}
                  onChange={(e) => setNewRoomCustomName(e.target.value)}
                  placeholder="e.g. Skirting, Granite Border, Balcony Cladding..."
                />
              </div>
            )}

            {/* Live Calculated Area Preview Banner */}
            {newRoomPreviewArea && newRoomPreviewArea > 0 && (
              <div
                style={{
                  background: 'rgba(20, 184, 166, 0.12)',
                  border: '1px solid rgba(20, 184, 166, 0.35)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Calculated Area:</span>
                <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                  {newRoomPreviewArea} sq ft
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCustomRoomFloorId(null)}
                disabled={isAddingRoom}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isAddingRoom || !newRoomName.trim()}
              >
                {isAddingRoom ? 'Adding Room...' : 'Add Room'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 7. Staircase Calculator Modal */}
      <StaircaseFormModal
        isOpen={staircaseOpen}
        onClose={() => setStaircaseOpen(false)}
        buildingId={buildingId}
        floors={floors}
        workTypes={workTypes}
        onSaved={() => invalidateAll()}
      />

      {/* 8. Delete Floor Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deletingFloor)}
        onClose={() => setDeletingFloor(null)}
        onConfirm={() => deleteFloorMutation.mutate(deletingFloor.id)}
        title="Delete Floor Level"
        message={`Delete "${deletingFloor?.name}"? All rooms and measurements on this floor will be removed.`}
        confirmLabel="Delete Floor"
        confirmVariant="danger"
        isLoading={deleteFloorMutation.isPending}
      />

      {/* 9. Delete Room Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deletingRoom)}
        onClose={() => setDeletingRoom(null)}
        onConfirm={() => deleteRoomMutation.mutate(deletingRoom.id)}
        title="Delete Room"
        message={`Delete "${deletingRoom?.name}"? All measurements in this room will be removed.`}
        confirmLabel="Delete Room"
        confirmVariant="danger"
        isLoading={deleteRoomMutation.isPending}
      />
    </div>
  );
}
