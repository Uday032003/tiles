import * as floorService from '../services/floorService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function listFloors(req, res, next) {
  try {
    const floors = await floorService.listFloors(req.params.buildingId, req.user);
    return sendSuccess(res, {
      message: 'Floors retrieved successfully',
      data: floors,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getFloor(req, res, next) {
  try {
    const floor = await floorService.getFloor(req.params.id, req.user);
    return sendSuccess(res, {
      message: 'Floor retrieved successfully',
      data: floor,
    });
  } catch (err) {
    return next(err);
  }
}

export async function createFloor(req, res, next) {
  try {
    const floor = await floorService.createFloor(req.params.buildingId, req.user, req.body);
    return sendCreated(res, {
      message: 'Floor created successfully',
      data: floor,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateFloor(req, res, next) {
  try {
    const floor = await floorService.updateFloor(req.params.id, req.user, req.body);
    return sendSuccess(res, {
      message: 'Floor updated successfully',
      data: floor,
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteFloor(req, res, next) {
  try {
    const deleted = await floorService.deleteFloor(req.params.id, req.user);
    return sendSuccess(res, {
      message: 'Floor deleted successfully',
      data: deleted,
    });
  } catch (err) {
    return next(err);
  }
}

export async function reorderFloors(req, res, next) {
  try {
    const floors = await floorService.reorderFloors(
      req.params.buildingId,
      req.user,
      req.body.floorIds
    );
    return sendSuccess(res, {
      message: 'Floors reordered successfully',
      data: floors,
    });
  } catch (err) {
    return next(err);
  }
}

export async function duplicateFloor(req, res, next) {
  try {
    const floor = await floorService.duplicateFloor(req.params.id, req.user, req.body);
    return sendCreated(res, {
      message: 'Floor duplicated successfully',
      data: floor,
    });
  } catch (err) {
    return next(err);
  }
}

