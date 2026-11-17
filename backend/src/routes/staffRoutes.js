import { Router } from 'express';
import * as permissionController from '../controllers/permissionController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createStaffSchema } from '../validators/permissionValidator.js';

const router = Router();

router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/', permissionController.listStaff);
router.post('/', validate(createStaffSchema), permissionController.createStaff);

export default router;

