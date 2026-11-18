import * as roomsRepo from '../repositories/roomsRepository.js';
import * as floorsRepo from '../repositories/floorsRepository.js';
import * as measService from './measurementService.js';
import { requireBuildingAccess } from './accessService.js';
import { ApiError } from '../utils/apiError.js';

export async function listRoomTypes() {
  return roomsRepo.listRoomTypes();
}

export async function listRooms(floorId, user) {
  const floor = await floorsRepo.findFloorById(floorId);
  if (!floor) {
    throw ApiError.notFound('Floor not found');
  }
  await requireBuildingAccess(floor.building_id, user);
  return roomsRepo.listRoomsByFloor(floorId);
}

export async function getRoom(roomId, user) {
  const room = await roomsRepo.findRoomById(roomId);
  if (!room) {
    throw ApiError.notFound('Room not found');
  }
  await requireBuildingAccess(room.building_id, user);
  return {
    ...roomsRepo.mapRoomRow(room),
    buildingId: room.building_id,
    floorName: room.floor_name,
  };
}

export async function createRoom(floorId, user, data) {
  const floor = await floorsRepo.findFloorById(floorId);
  if (!floor) {
    throw ApiError.notFound('Floor not found');
  }
  await requireBuildingAccess(floor.building_id, user, 'can_edit_measurements');
  const room = await roomsRepo.createRoom(floorId, floor.building_id, user.id, data);
  if (data.initialMeasurement) {
    try {
      await measService.createMeasurement(room.id, user, data.initialMeasurement);
    } catch (err) {
      console.error('Failed to create initial measurement for room:', err);
    }
  }
  return room;
}

export async function updateRoom(roomId, user, data) {
  const room = await roomsRepo.findRoomById(roomId);
  if (!room) {
    throw ApiError.notFound('Room not found');
  }
  await requireBuildingAccess(room.building_id, user, 'can_edit_measurements');
  return roomsRepo.updateRoom(roomId, data);
}

export async function deleteRoom(roomId, user) {
  const room = await roomsRepo.findRoomById(roomId);
  if (!room) {
    throw ApiError.notFound('Room not found');
  }
  await requireBuildingAccess(room.building_id, user, 'can_edit_measurements');
  return roomsRepo.softDeleteRoom(roomId, room.building_id, user.id);
}

export async function reorderRooms(floorId, user, roomIds) {
  const floor = await floorsRepo.findFloorById(floorId);
  if (!floor) {
    throw ApiError.notFound('Floor not found');
  }
  await requireBuildingAccess(floor.building_id, user, 'can_edit_measurements');
  await roomsRepo.reorderRooms(floorId, roomIds);
  return roomsRepo.listRoomsByFloor(floorId);
}

