import { Router } from 'express';
import * as roomController from '../controllers/roomController.js';
import * as measController from '../controllers/measurementController.js';
import * as stairController from '../controllers/staircaseController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateRoomSchema } from '../validators/roomValidator.js';
import { createMeasurementSchema } from '../validators/measurementValidator.js';
import { upsertStaircaseSchema } from '../validators/staircaseValidator.js';
import { uuidParamSchema } from '../validators/commonValidator.js';

const router = Router();

router.use(authenticate);

router.get('/:id', validate(uuidParamSchema('id'), 'params'), roomController.getRoom);
router.patch(
  '/:id',
  validate(uuidParamSchema('id'), 'params'),
  validate(updateRoomSchema),
  roomController.updateRoom
);
router.delete('/:id', validate(uuidParamSchema('id'), 'params'), roomController.deleteRoom);

// Room measurements & staircases
router.get(
  '/:roomId/measurements',
  validate(uuidParamSchema('roomId'), 'params'),
  measController.listMeasurementsByRoom
);
router.post(
  '/:roomId/measurements',
  validate(uuidParamSchema('roomId'), 'params'),
  validate(createMeasurementSchema),
  measController.createMeasurement
);

router.get(
  '/:roomId/staircases',
  validate(uuidParamSchema('roomId'), 'params'),
  stairController.listByRoom
);
router.post(
  '/:roomId/staircases',
  validate(uuidParamSchema('roomId'), 'params'),
  validate(upsertStaircaseSchema),
  stairController.create
);

export default router;

