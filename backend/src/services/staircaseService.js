import * as stairRepo from '../repositories/staircasesRepository.js';
import * as roomsRepo from '../repositories/roomsRepository.js';
import { requireBuildingAccess } from './accessService.js';
import { ApiError } from '../utils/apiError.js';
import { calculateStaircase } from '../utils/measurementCalculator.js';

function runStaircaseCalc(payload) {
  try {
    return calculateStaircase(payload);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

export async function listStaircasesByRoom(roomId, user) {
  const room = await roomsRepo.findRoomById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  await requireBuildingAccess(room.building_id, user, 'can_view_measurements');
  return stairRepo.listStaircasesByRoom(roomId);
}

export async function listStaircasesByBuilding(buildingId, user) {
  await requireBuildingAccess(buildingId, user, 'can_view_measurements');
  return stairRepo.listStaircasesByBuilding(buildingId);
}

export async function createStaircase(roomId, user, payload) {
  const room = await roomsRepo.findRoomById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  await requireBuildingAccess(room.building_id, user, 'can_edit_measurements');

  const calc = runStaircaseCalc(payload);
  return stairRepo.createStaircase(room, calc, payload.name, payload.notes, user.id);
}

export async function updateStaircase(staircaseId, user, payload) {
  const existing = await stairRepo.findStaircaseById(staircaseId);
  if (!existing) throw ApiError.notFound('Staircase not found');
  await requireBuildingAccess(existing.building_id, user, 'can_edit_measurements');

  const calc = runStaircaseCalc(payload);
  return stairRepo.updateStaircase(
    staircaseId,
    existing.building_id,
    calc,
    payload.name,
    payload.notes,
    user.id
  );
}

export async function deleteStaircase(staircaseId, user) {
  const existing = await stairRepo.findStaircaseById(staircaseId);
  if (!existing) throw ApiError.notFound('Staircase not found');
  await requireBuildingAccess(existing.building_id, user, 'can_edit_measurements');
  await stairRepo.deleteStaircase(existing, user.id);
  return { id: existing.id };
}

