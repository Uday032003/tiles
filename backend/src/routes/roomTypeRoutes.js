import { Router } from 'express';
import * as roomController from '../controllers/roomController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, roomController.listRoomTypes);

export default router;

