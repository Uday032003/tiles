import * as permissionsRepository from '../repositories/permissionsRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { requireBuildingAccess } from './accessService.js';
import { hashPassword } from '../utils/password.js';
import { ApiError } from '../utils/apiError.js';

export async function listStaffUsers(actor) {
  if (actor.role !== 'ADMIN') {
    throw new ApiError(403, 'Only administrators can view staff accounts');
  }
  return permissionsRepository.listStaffUsers();
}

export async function createStaffUser(actor, payload) {
  if (actor.role !== 'ADMIN') {
    throw new ApiError(403, 'Only administrators can create staff accounts');
  }
  const existing = await usersRepository.findUserByEmail(payload.email.toLowerCase());
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }
  const passwordHash = await hashPassword(payload.password);
  return permissionsRepository.createStaffUser({
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    passwordHash,
  });
}

export async function listBuildingPermissions(buildingId, actor) {
  if (actor.role !== 'ADMIN') {
    throw new ApiError(403, 'Only administrators can manage building permissions');
  }
  await requireBuildingAccess(buildingId, actor);
  return permissionsRepository.listBuildingPermissions(buildingId);
}

export async function upsertBuildingPermission(buildingId, actor, payload) {
  if (actor.role !== 'ADMIN') {
    throw new ApiError(403, 'Only administrators can grant building permissions');
  }
  await requireBuildingAccess(buildingId, actor);

  const staff = await permissionsRepository.findStaffUserById(payload.userId);
  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  return permissionsRepository.upsertBuildingPermission(buildingId, payload.userId, payload, actor.id);
}

export async function revokeBuildingPermission(buildingId, targetUserId, actor) {
  if (actor.role !== 'ADMIN') {
    throw new ApiError(403, 'Only administrators can revoke building permissions');
  }
  await requireBuildingAccess(buildingId, actor);
  return permissionsRepository.revokeBuildingPermission(buildingId, targetUserId, actor.id);
}

