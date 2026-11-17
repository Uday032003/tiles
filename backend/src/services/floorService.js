import * as floorsRepo from '../repositories/floorsRepository.js';
import { requireBuildingAccess } from './accessService.js';
import { ApiError } from '../utils/apiError.js';

export async function listFloors(buildingId, user) {
  await requireBuildingAccess(buildingId, user);
  return floorsRepo.listFloorsByBuilding(buildingId);
}

export async function getFloor(floorId, user) {
  const floor = await floorsRepo.findFloorById(floorId);
  if (!floor) {
    throw ApiError.notFound('Floor not found');
  }
  await requireBuildingAccess(floor.building_id, user);
  return {
    ...floorsRepo.mapFloorRow(floor),
    buildingName: floor.building_name,
  };
}

export async function createFloor(buildingId, user, data) {
  await requireBuildingAccess(buildingId, user, 'can_edit_measurements');
  return floorsRepo.createFloor(buildingId, user.id, data);
}

export async function updateFloor(floorId, user, data) {
  const floor = await floorsRepo.findFloorById(floorId);
  if (!floor) {
    throw ApiError.notFound('Floor not found');
  }
  await requireBuildingAccess(floor.building_id, user, 'can_edit_measurements');
  return floorsRepo.updateFloor(floorId, data);
}

export async function deleteFloor(floorId, user) {
  const floor = await floorsRepo.findFloorById(floorId);
  if (!floor) {
    throw ApiError.notFound('Floor not found');
  }
  await requireBuildingAccess(floor.building_id, user, 'can_edit_measurements');
  return floorsRepo.softDeleteFloor(floorId, floor.building_id, user.id);
}

export async function reorderFloors(buildingId, user, floorIds) {
  await requireBuildingAccess(buildingId, user, 'can_edit_measurements');
  await floorsRepo.reorderFloors(buildingId, floorIds);
  return floorsRepo.listFloorsByBuilding(buildingId);
}

export async function duplicateFloor(floorId, user, options) {
  const sourceFloor = await floorsRepo.findFloorById(floorId);
  if (!sourceFloor) {
    throw ApiError.notFound('Source floor not found');
  }
  await requireBuildingAccess(sourceFloor.building_id, user, 'can_edit_measurements');
  return floorsRepo.duplicateFloor(sourceFloor, options, user.id);
}

