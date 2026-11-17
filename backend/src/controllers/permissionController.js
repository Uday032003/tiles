import * as permissionService from '../services/permissionService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function listStaff(req, res, next) {
  try {
    const staff = await permissionService.listStaffUsers(req.user);
    return sendSuccess(res, {
      message: 'Staff users fetched successfully',
      data: staff,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createStaff(req, res, next) {
  try {
    const staff = await permissionService.createStaffUser(req.user, req.body);
    return sendCreated(res, {
      message: 'Staff account created successfully',
      data: staff,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listBuildingPermissions(req, res, next) {
  try {
    const permissions = await permissionService.listBuildingPermissions(
      req.params.buildingId,
      req.user
    );
    return sendSuccess(res, {
      message: 'Building permissions fetched successfully',
      data: permissions,
    });
  } catch (error) {
    return next(error);
  }
}

export async function upsertBuildingPermission(req, res, next) {
  try {
    const permissions = await permissionService.upsertBuildingPermission(
      req.params.buildingId,
      req.user,
      req.body
    );
    return sendSuccess(res, {
      message: 'Staff permissions saved successfully',
      data: permissions,
    });
  } catch (error) {
    return next(error);
  }
}

export async function revokeBuildingPermission(req, res, next) {
  try {
    const result = await permissionService.revokeBuildingPermission(
      req.params.buildingId,
      req.params.userId,
      req.user
    );
    return sendSuccess(res, {
      message: 'Staff access revoked successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

