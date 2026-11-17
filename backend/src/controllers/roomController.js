import * as roomService from '../services/roomService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function listRoomTypes(_req, res, next) {
  try {
    const types = await roomService.listRoomTypes();
    return sendSuccess(res, {
      message: 'Room types retrieved successfully',
      data: types,
    });
  } catch (err) {
    return next(err);
  }
}

export async function listRooms(req, res, next) {
  try {
    const rooms = await roomService.listRooms(req.params.floorId, req.user);
    return sendSuccess(res, {
      message: 'Rooms retrieved successfully',
      data: rooms,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getRoom(req, res, next) {
  try {
    const room = await roomService.getRoom(req.params.id, req.user);
    return sendSuccess(res, {
      message: 'Room retrieved successfully',
      data: room,
    });
  } catch (err) {
    return next(err);
  }
}

export async function createRoom(req, res, next) {
  try {
    const room = await roomService.createRoom(req.params.floorId, req.user, req.body);
    return sendCreated(res, {
      message: 'Room created successfully',
      data: room,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateRoom(req, res, next) {
  try {
    const room = await roomService.updateRoom(req.params.id, req.user, req.body);
    return sendSuccess(res, {
      message: 'Room updated successfully',
      data: room,
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteRoom(req, res, next) {
  try {
    const deleted = await roomService.deleteRoom(req.params.id, req.user);
    return sendSuccess(res, {
      message: 'Room deleted successfully',
      data: deleted,
    });
  } catch (err) {
    return next(err);
  }
}

export async function reorderRooms(req, res, next) {
  try {
    const rooms = await roomService.reorderRooms(req.params.floorId, req.user, req.body.roomIds);
    return sendSuccess(res, {
      message: 'Rooms reordered successfully',
      data: rooms,
    });
  } catch (err) {
    return next(err);
  }
}

