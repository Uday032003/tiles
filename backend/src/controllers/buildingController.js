import * as buildingService from '../services/buildingService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function listBuildings(req, res, next) {
  try {
    const result = await buildingService.listBuildings(req.user, req.query);
    return sendSuccess(res, {
      message: 'Buildings retrieved successfully',
      data: result.items,
      meta: result.meta,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getBuilding(req, res, next) {
  try {
    const building = await buildingService.getBuilding(req.params.id, req.user);
    return sendSuccess(res, {
      message: 'Building details retrieved successfully',
      data: building,
    });
  } catch (err) {
    return next(err);
  }
}

export async function createBuilding(req, res, next) {
  try {
    const building = await buildingService.createBuilding(req.user, req.body);
    return sendCreated(res, {
      message: 'Building created successfully',
      data: building,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateBuilding(req, res, next) {
  try {
    const building = await buildingService.updateBuilding(req.params.id, req.user, req.body);
    return sendSuccess(res, {
      message: 'Building updated successfully',
      data: building,
    });
  } catch (err) {
    return next(err);
  }
}

export async function archiveBuilding(req, res, next) {
  try {
    const building = await buildingService.archiveBuilding(req.params.id, req.user);
    return sendSuccess(res, {
      message: 'Building archived successfully',
      data: building,
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteBuilding(req, res, next) {
  try {
    const deleted = await buildingService.deleteBuilding(req.params.id, req.user);
    return sendSuccess(res, {
      message: 'Building deleted successfully',
      data: deleted,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getBuildingTree(req, res, next) {
  try {
    const tree = await buildingService.getBuildingTree(req.params.id, req.user);
    return sendSuccess(res, {
      message: 'Building tree fetched successfully',
      data: tree,
    });
  } catch (err) {
    return next(err);
  }
}

export async function initBuildingLayout(req, res, next) {
  try {
    const result = await buildingService.initBuildingLayout(
      req.params.id,
      req.user,
      req.body?.layout || 'STANDARD_RESIDENTIAL'
    );
    return sendSuccess(res, {
      message: 'Building layout initialized successfully',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

