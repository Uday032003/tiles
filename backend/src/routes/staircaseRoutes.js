import { Router } from 'express';
import * as stairController from '../controllers/staircaseController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uuidParamSchema } from '../validators/commonValidator.js';
import { upsertStaircaseSchema } from '../validators/staircaseValidator.js';

const router = Router();

router.use(authenticate);

router.patch(
  '/:id',
  validate(uuidParamSchema('id'), 'params'),
  validate(upsertStaircaseSchema),
  stairController.update
);
router.delete('/:id', validate(uuidParamSchema('id'), 'params'), stairController.remove);

export default router;

