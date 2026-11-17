import * as measRepo from '../repositories/measurementsRepository.js';
import * as roomsRepo from '../repositories/roomsRepository.js';
import * as floorsRepo from '../repositories/floorsRepository.js';
import { requireBuildingAccess } from './accessService.js';
import { ApiError } from '../utils/apiError.js';
import {
  calculateDeductionArea,
  calculateMeasurement,
  calculateSegmentArea,
} from '../utils/measurementCalculator.js';

const CATEGORY_TO_ROLE = {
  FLOOR_TILES: 'FLOOR',
  WALL_TILES: 'WALL',
  GRANITE: 'GRANITE',
  SKIRTING: 'SKIRTING',
  STAIRCASE: 'STAIRCASE',
  ELEVATION: 'ELEVATION',
  OTHER: 'OTHER',
};

function runCalculation(payload, surfaceRole) {
  try {
    return calculateMeasurement({ ...payload, surfaceRole });
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}

export async function listWorkTypes() {
  return measRepo.listWorkTypes();
}

export async function listMeasurements(user, queryParams) {
  if (queryParams.buildingId) {
    await requireBuildingAccess(queryParams.buildingId, user, 'can_view_measurements');
  }
  return measRepo.listMeasurements({
    userId: user.id,
    userRole: user.role,
    ...queryParams,
  });
}

export async function listMeasurementsByRoom(roomId, user) {
  const room = await roomsRepo.findRoomById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  await requireBuildingAccess(room.building_id, user, 'can_view_measurements');

  const result = await measRepo.listMeasurements({
    userId: user.id,
    userRole: user.role,
    roomId,
    limit: 200,
  });
  return result.items;
}

export async function getBuildingAreaSummary(buildingId, user, floorId = null, roomId = null) {
  await requireBuildingAccess(buildingId, user, 'can_view_measurements');
  return measRepo.getAreaSummary({ buildingId, floorId, roomId });
}

export async function getFloorAreaSummary(floorId, user) {
  const floor = await floorsRepo.findFloorById(floorId);
  if (!floor) throw ApiError.notFound('Floor not found');
  await requireBuildingAccess(floor.building_id, user, 'can_view_measurements');
  return measRepo.getAreaSummary({ buildingId: floor.building_id, floorId });
}

export async function createMeasurement(roomId, user, payload) {
  const room = await roomsRepo.findRoomById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  await requireBuildingAccess(room.building_id, user, 'can_edit_measurements');

  const workType = await measRepo.findWorkTypeById(payload.workTypeId);
  if (!workType) throw ApiError.badRequest('Selected work type does not exist');

  const surfaceRole = payload.surfaceRole || CATEGORY_TO_ROLE[workType.category] || 'OTHER';
  const calculated = runCalculation(payload, surfaceRole);

  return measRepo.createMeasurement(
    room,
    workType,
    calculated,
    { ...payload, surfaceRole },
    user.id
  );
}

export async function updateMeasurement(measurementId, user, payload) {
  const existing = await measRepo.findMeasurementById(measurementId);
  if (!existing) throw ApiError.notFound('Measurement not found');
  await requireBuildingAccess(existing.buildingId, user, 'can_edit_measurements');

  const workType = await measRepo.findWorkTypeById(payload.workTypeId);
  if (!workType) throw ApiError.badRequest('Selected work type does not exist');

  const surfaceRole = payload.surfaceRole || CATEGORY_TO_ROLE[workType.category] || 'OTHER';
  const calculated = runCalculation(payload, surfaceRole);

  return measRepo.updateMeasurement(
    existing,
    workType,
    calculated,
    { ...payload, surfaceRole },
    user.id
  );
}

export async function duplicateMeasurement(measurementId, user) {
  const existing = await measRepo.findMeasurementById(measurementId);
  if (!existing) throw ApiError.notFound('Measurement not found');
  await requireBuildingAccess(existing.buildingId, user, 'can_edit_measurements');
  return measRepo.duplicateMeasurement(existing, user.id);
}

export async function deleteMeasurement(measurementId, user) {
  const existing = await measRepo.findMeasurementById(measurementId);
  if (!existing) throw ApiError.notFound('Measurement not found');
  await requireBuildingAccess(existing.buildingId, user, 'can_edit_measurements');
  await measRepo.softDeleteMeasurement(existing, user.id);
  return { id: existing.id };
}

export async function addSegment(measurementId, user, segInput) {
  const existing = await measRepo.findMeasurementById(measurementId);
  if (!existing) throw ApiError.notFound('Measurement not found');
  await requireBuildingAccess(existing.buildingId, user, 'can_edit_measurements');

  let segCalc;
  try {
    segCalc = calculateSegmentArea(segInput);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
  return measRepo.addSegmentToMeasurement(existing, segCalc, segInput, user.id);
}

export async function deleteSegment(segmentId, user) {
  const seg = await measRepo.findSegmentById(segmentId);
  if (!seg) throw ApiError.notFound('Segment not found');
  const meas = await measRepo.findMeasurementById(seg.measurement_id);
  if (!meas) throw ApiError.notFound('Parent measurement not found');
  await requireBuildingAccess(meas.buildingId, user, 'can_edit_measurements');
  return measRepo.removeSegment(segmentId, user.id);
}

export async function addDeduction(measurementId, user, dedInput) {
  const existing = await measRepo.findMeasurementById(measurementId);
  if (!existing) throw ApiError.notFound('Measurement not found');
  await requireBuildingAccess(existing.buildingId, user, 'can_edit_measurements');

  let dedCalc;
  try {
    dedCalc = calculateDeductionArea(dedInput);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
  return measRepo.addDeductionToMeasurement(existing, dedCalc, dedInput, user.id);
}

export async function deleteDeduction(deductionId, user) {
  const ded = await measRepo.findDeductionById(deductionId);
  if (!ded) throw ApiError.notFound('Deduction not found');
  const meas = await measRepo.findMeasurementById(ded.measurement_id);
  if (!meas) throw ApiError.notFound('Parent measurement not found');
  await requireBuildingAccess(meas.buildingId, user, 'can_edit_measurements');
  return measRepo.removeDeduction(deductionId, user.id);
}

export async function getMeasurementHistory(measurementId, user) {
  const existing = await measRepo.findMeasurementById(measurementId);
  if (!existing) throw ApiError.notFound('Measurement not found');
  await requireBuildingAccess(existing.buildingId, user, 'can_view_measurements');
  return measRepo.getMeasurementHistory(measurementId);
}
