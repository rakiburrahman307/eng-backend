import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { PointTableController } from './poientTable.controlle';

const router = express.Router();

// GET POINT TABLE, UPDATE/UPSERT MANUAL STANDING
router
  .route('/')
  .get(PointTableController.getPointTable)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    PointTableController.updatePointTable
  )
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    PointTableController.updatePointTable
  );

// RESET STANDING BACK TO AUTO-CALC
router
  .route('/reset')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    PointTableController.resetPointTable
  );

export default router;
