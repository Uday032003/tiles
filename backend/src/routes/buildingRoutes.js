import { Router } from 'express';
import * as buildingController from '../controllers/buildingController.js';
import * as floorController from '../controllers/floorController.js';
import * as measController from '../controllers/measurementController.js';
import * as stairController from '../controllers/staircaseController.js';
import * as permissionController from '../controllers/permissionController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createBuildingSchema,
  initBuildingLayoutSchema,
  listBuildingsQuerySchema,
  updateBuildingSchema,
} from '../validators/buildingValidator.js';
import { createFloorSchema, reorderFloorsSchema } from '../validators/floorValidator.js';
import { uuidParamSchema } from '../validators/commonValidator.js';
import { upsertPermissionSchema } from '../validators/permissionValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listBuildingsQuerySchema, 'query'), buildingController.listBuildings);
router.post('/', validate(createBuildingSchema), buildingController.createBuilding);
router.get('/:id', validate(uuidParamSchema('id'), 'params'), buildingController.getBuilding);
router.get('/:id/tree', validate(uuidParamSchema('id'), 'params'), buildingController.getBuildingTree);
router.post(
  '/:id/init-layout',
  validate(uuidParamSchema('id'), 'params'),
  validate(initBuildingLayoutSchema),
  buildingController.initBuildingLayout
);
router.patch(
  '/:id',
  validate(uuidParamSchema('id'), 'params'),
  validate(updateBuildingSchema),
  buildingController.updateBuilding
);
router.post('/:id/archive', validate(uuidParamSchema('id'), 'params'), buildingController.archiveBuilding);
router.delete('/:id', validate(uuidParamSchema('id'), 'params'), buildingController.deleteBuilding);

// Nested building floor routes
router.get(
  '/:buildingId/floors',
  validate(uuidParamSchema('buildingId'), 'params'),
  floorController.listFloors
);
router.post(
  '/:buildingId/floors',
  validate(uuidParamSchema('buildingId'), 'params'),
  validate(createFloorSchema),
  floorController.createFloor
);
router.patch(
  '/:buildingId/floors/reorder',
  validate(uuidParamSchema('buildingId'), 'params'),
  validate(reorderFloorsSchema),
  floorController.reorderFloors
);

// Building area summary & staircases
router.get(
  '/:buildingId/area-summary',
  validate(uuidParamSchema('buildingId'), 'params'),
  measController.getBuildingSummary
);
router.get(
  '/:buildingId/staircases',
  validate(uuidParamSchema('buildingId'), 'params'),
  stairController.listByBuilding
);

// Staff permissions (ADMIN only)
router.get(
  '/:buildingId/permissions',
  authorizeRoles('ADMIN'),
  validate(uuidParamSchema('buildingId'), 'params'),
  permissionController.listBuildingPermissions
);
router.put(
  '/:buildingId/permissions',
  authorizeRoles('ADMIN'),
  validate(uuidParamSchema('buildingId'), 'params'),
  validate(upsertPermissionSchema),
  permissionController.upsertBuildingPermission
);
router.delete(
  '/:buildingId/permissions/:userId',
  authorizeRoles('ADMIN'),
  validate(uuidParamSchema('buildingId'), 'params'),
  validate(uuidParamSchema('userId'), 'params'),
  permissionController.revokeBuildingPermission
);

export default router;

