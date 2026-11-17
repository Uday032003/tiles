import { Router } from 'express';
import * as measController from '../controllers/measurementController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uuidParamSchema } from '../validators/commonValidator.js';
import {
  deductionInputSchema,
  listMeasurementsQuerySchema,
  segmentInputSchema,
  updateMeasurementSchema,
} from '../validators/measurementValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listMeasurementsQuerySchema, 'query'), measController.listMeasurements);
router.patch(
  '/:id',
  validate(uuidParamSchema('id'), 'params'),
  validate(updateMeasurementSchema),
  measController.updateMeasurement
);
router.delete('/:id', validate(uuidParamSchema('id'), 'params'), measController.deleteMeasurement);
router.post(
  '/:id/duplicate',
  validate(uuidParamSchema('id'), 'params'),
  measController.duplicateMeasurement
);
router.get(
  '/:id/history',
  validate(uuidParamSchema('id'), 'params'),
  measController.getMeasurementHistory
);
router.post(
  '/:id/segments',
  validate(uuidParamSchema('id'), 'params'),
  validate(segmentInputSchema),
  measController.addSegment
);
router.post(
  '/:id/deductions',
  validate(uuidParamSchema('id'), 'params'),
  validate(deductionInputSchema),
  measController.addDeduction
);

export default router;

