import * as buildingsRepo from '../repositories/buildingsRepository.js';
import { requireBuildingAccess } from './accessService.js';
import { ApiError } from '../utils/apiError.js';

export async function listBuildings(user, queryParams) {
  return buildingsRepo.listBuildings({
    userId: user.id,
    userRole: user.role,
    ...queryParams,
  });
}

export async function getBuilding(buildingId, user) {
  const { building: accessed } = await requireBuildingAccess(buildingId, user);
  const targetId = accessed?.id || buildingId;
  const building = await buildingsRepo.findBuildingDetailsById(targetId);
  if (!building) {
    throw ApiError.notFound('Building not found');
  }
  return building;
}

export async function createBuilding(user, data) {
  if (user.role !== 'ADMIN') {
    throw ApiError.forbidden('Only administrators can create buildings');
  }
  return buildingsRepo.createBuilding(user.id, data);
}

export async function updateBuilding(buildingId, user, data) {
  const { isOwner } = await requireBuildingAccess(buildingId, user);
  if (!isOwner) {
    throw ApiError.forbidden('Only the building owner can edit building details');
  }
  const updated = await buildingsRepo.updateBuilding(buildingId, user.id, data);
  if (!updated) {
    throw ApiError.notFound('Building not found');
  }
  return updated;
}

export async function archiveBuilding(buildingId, user) {
  const { isOwner } = await requireBuildingAccess(buildingId, user);
  if (!isOwner) {
    throw ApiError.forbidden('Only the building owner can archive buildings');
  }
  return buildingsRepo.softDeleteBuilding(buildingId, user.id);
}

export async function deleteBuilding(buildingId, user) {
  const { isOwner } = await requireBuildingAccess(buildingId, user);
  if (!isOwner) {
    throw ApiError.forbidden('Only the building owner can delete buildings');
  }
  const deleted = await buildingsRepo.softDeleteBuilding(buildingId, user.id);
  if (!deleted) {
    throw ApiError.notFound('Building not found');
  }
  return deleted;
}

export async function getBuildingTree(buildingId, user) {
  const { building: accessed } = await requireBuildingAccess(buildingId, user);
  const targetId = accessed?.id || buildingId;
  const tree = await buildingsRepo.getBuildingTree(targetId);
  if (!tree) {
    throw ApiError.notFound('Building not found');
  }
  return tree;
}

export async function initBuildingLayout(buildingId, user, layout = 'STANDARD_RESIDENTIAL') {
  await requireBuildingAccess(buildingId, user, 'can_edit_measurements');
  return buildingsRepo.initBuildingLayout(buildingId, layout);
}

