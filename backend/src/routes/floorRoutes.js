import { Router } from 'express';
import * as floorController from '../controllers/floorController.js';
import * as roomController from '../controllers/roomController.js';
import * as measController from '../controllers/measurementController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { duplicateFloorSchema, updateFloorSchema } from '../validators/floorValidator.js';
import { createRoomSchema, reorderRoomsSchema } from '../validators/roomValidator.js';
import { uuidParamSchema } from '../validators/commonValidator.js';

const router = Router();

router.use(authenticate);

router.get('/:id', validate(uuidParamSchema('id'), 'params'), floorController.getFloor);
router.patch(
  '/:id',
  validate(uuidParamSchema('id'), 'params'),
  validate(updateFloorSchema),
  floorController.updateFloor
);
router.delete('/:id', validate(uuidParamSchema('id'), 'params'), floorController.deleteFloor);
router.post(
  '/:id/duplicate',
  validate(uuidParamSchema('id'), 'params'),
  validate(duplicateFloorSchema),
  floorController.duplicateFloor
);

// Nested floor room routes
router.get(
  '/:floorId/rooms',
  validate(uuidParamSchema('floorId'), 'params'),
  roomController.listRooms
);
router.post(
  '/:floorId/rooms',
  validate(uuidParamSchema('floorId'), 'params'),
  validate(createRoomSchema),
  roomController.createRoom
);
router.patch(
  '/:floorId/rooms/reorder',
  validate(uuidParamSchema('floorId'), 'params'),
  validate(reorderRoomsSchema),
  roomController.reorderRooms
);

router.get(
  '/:floorId/area-summary',
  validate(uuidParamSchema('floorId'), 'params'),
  measController.getFloorSummary
);

export default router;

