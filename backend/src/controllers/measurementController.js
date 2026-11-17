import * as measService from '../services/measurementService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function listWorkTypes(_req, res, next) {
  try {
    const types = await measService.listWorkTypes();
    return sendSuccess(res, { message: 'Work types retrieved successfully', data: types });
  } catch (err) {
    return next(err);
  }
}

export async function listMeasurements(req, res, next) {
  try {
    const result = await measService.listMeasurements(req.user, req.query);
    return sendSuccess(res, {
      message: 'Measurements retrieved successfully',
      data: result.items,
      meta: result.meta,
    });
  } catch (err) {
    return next(err);
  }
}

export async function listMeasurementsByRoom(req, res, next) {
  try {
    const items = await measService.listMeasurementsByRoom(req.params.roomId, req.user);
    return sendSuccess(res, { message: 'Room measurements retrieved successfully', data: items });
  } catch (err) {
    return next(err);
  }
}

export async function getBuildingSummary(req, res, next) {
  try {
    const summary = await measService.getBuildingAreaSummary(req.params.buildingId, req.user);
    return sendSuccess(res, { message: 'Area summary retrieved successfully', data: summary });
  } catch (err) {
    return next(err);
  }
}

export async function getFloorSummary(req, res, next) {
  try {
    const summary = await measService.getFloorAreaSummary(req.params.floorId, req.user);
    return sendSuccess(res, { message: 'Floor area summary retrieved successfully', data: summary });
  } catch (err) {
    return next(err);
  }
}

export async function createMeasurement(req, res, next) {
  try {
    const created = await measService.createMeasurement(req.params.roomId, req.user, req.body);
    return sendCreated(res, { message: 'Measurement created successfully', data: created });
  } catch (err) {
    return next(err);
  }
}

export async function updateMeasurement(req, res, next) {
  try {
    const updated = await measService.updateMeasurement(req.params.id, req.user, req.body);
    return sendSuccess(res, { message: 'Measurement updated successfully', data: updated });
  } catch (err) {
    return next(err);
  }
}

export async function duplicateMeasurement(req, res, next) {
  try {
    const duplicated = await measService.duplicateMeasurement(req.params.id, req.user);
    return sendCreated(res, { message: 'Measurement duplicated successfully', data: duplicated });
  } catch (err) {
    return next(err);
  }
}

export async function deleteMeasurement(req, res, next) {
  try {
    const deleted = await measService.deleteMeasurement(req.params.id, req.user);
    return sendSuccess(res, { message: 'Measurement deleted successfully', data: deleted });
  } catch (err) {
    return next(err);
  }
}

export async function addSegment(req, res, next) {
  try {
    const updated = await measService.addSegment(req.params.id, req.user, req.body);
    return sendCreated(res, { message: 'Segment added successfully', data: updated });
  } catch (err) {
    return next(err);
  }
}

export async function deleteSegment(req, res, next) {
  try {
    const updated = await measService.deleteSegment(req.params.id, req.user);
    return sendSuccess(res, { message: 'Segment removed successfully', data: updated });
  } catch (err) {
    return next(err);
  }
}

export async function addDeduction(req, res, next) {
  try {
    const updated = await measService.addDeduction(req.params.id, req.user, req.body);
    return sendCreated(res, { message: 'Deduction added successfully', data: updated });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDeduction(req, res, next) {
  try {
    const updated = await measService.deleteDeduction(req.params.id, req.user);
    return sendSuccess(res, { message: 'Deduction removed successfully', data: updated });
  } catch (err) {
    return next(err);
  }
}

export async function getMeasurementHistory(req, res, next) {
  try {
    const history = await measService.getMeasurementHistory(req.params.id, req.user);
    return sendSuccess(res, { message: 'Measurement history retrieved successfully', data: history });
  } catch (err) {
    return next(err);
  }
}
