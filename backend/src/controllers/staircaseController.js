import * as stairService from '../services/staircaseService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function listByRoom(req, res, next) {
  try {
    const items = await stairService.listStaircasesByRoom(req.params.roomId, req.user);
    return sendSuccess(res, { message: 'Staircases retrieved successfully', data: items });
  } catch (err) {
    return next(err);
  }
}

export async function listByBuilding(req, res, next) {
  try {
    const items = await stairService.listStaircasesByBuilding(req.params.buildingId, req.user);
    return sendSuccess(res, { message: 'Building staircases retrieved successfully', data: items });
  } catch (err) {
    return next(err);
  }
}

export async function create(req, res, next) {
  try {
    const created = await stairService.createStaircase(req.params.roomId, req.user, req.body);
    return sendCreated(res, { message: 'Staircase measurement created successfully', data: created });
  } catch (err) {
    return next(err);
  }
}

export async function update(req, res, next) {
  try {
    const updated = await stairService.updateStaircase(req.params.id, req.user, req.body);
    return sendSuccess(res, { message: 'Staircase measurement updated successfully', data: updated });
  } catch (err) {
    return next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const deleted = await stairService.deleteStaircase(req.params.id, req.user);
    return sendSuccess(res, { message: 'Staircase measurement deleted successfully', data: deleted });
  } catch (err) {
    return next(err);
  }
}

