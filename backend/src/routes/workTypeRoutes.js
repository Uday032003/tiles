import { Router } from 'express';
import * as measController from '../controllers/measurementController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, measController.listWorkTypes);

export default router;

