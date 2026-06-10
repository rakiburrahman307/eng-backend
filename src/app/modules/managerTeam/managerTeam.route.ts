import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { ManagerTeamController } from './managerTeam.controller';

const router = express.Router();

// ASSIGN MANAGER TO TEAM
router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ManagerTeamController.assignManagerToTeam
  )
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ManagerTeamController.getAllManagerTeams
  );

// REMOVE MANAGER FROM TEAM
router
  .route('/:id')
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    ManagerTeamController.removeManagerFromTeam
  );

  router.get(
  '/my-teams',
  auth(USER_ROLES.MANAGER),
  ManagerTeamController.getMyTeams
);
export default router;