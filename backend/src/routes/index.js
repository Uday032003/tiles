import { Router } from 'express';
import { checkDbConnection } from '../config/db.js';
import { sendSuccess } from '../utils/response.js';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import buildingRoutes from './buildingRoutes.js';
import floorRoutes from './floorRoutes.js';
import roomRoutes from './roomRoutes.js';
import roomTypeRoutes from './roomTypeRoutes.js';
import workTypeRoutes from './workTypeRoutes.js';
import measurementRoutes from './measurementRoutes.js';
import staircaseRoutes from './staircaseRoutes.js';
import staffRoutes from './staffRoutes.js';
import * as measController from '../controllers/measurementController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uuidParamSchema } from '../validators/commonValidator.js';

const router = Router();

router.get('/health', async (_req, res) => {
  const dbStatus = await checkDbConnection();
  return sendSuccess(res, {
    message: 'DM Tiles API is running',
    data: {
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/buildings', buildingRoutes);
router.use('/floors', floorRoutes);
router.use('/rooms', roomRoutes);
router.use('/room-types', roomTypeRoutes);
router.use('/work-types', workTypeRoutes);
router.use('/measurements', measurementRoutes);
router.delete(
  '/measurement-segments/:id',
  authenticate,
  validate(uuidParamSchema('id'), 'params'),
  measController.deleteSegment
);
router.delete(
  '/measurement-deductions/:id',
  authenticate,
  validate(uuidParamSchema('id'), 'params'),
  measController.deleteDeduction
);
router.use('/staircases', staircaseRoutes);
router.use('/staff', staffRoutes);

export default router;

