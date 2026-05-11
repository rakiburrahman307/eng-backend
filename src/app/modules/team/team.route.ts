import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { TeamController } from './team.controller';
import fileUploadHandler from '../../middlewares/fileUploaderHandler';

const router = express.Router();

// CREATE + GET ALL
router
  .route('/')
  .post(
      auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
      fileUploadHandler(),
    TeamController.createTeam
  )
  .get(TeamController.getAllTeams);

// SINGLE + UPDATE + DELETE
router
  .route('/:id')
  .get(TeamController.getSingleTeam)
  .patch(
      auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
      fileUploadHandler(), 
    TeamController.updateTeam
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    TeamController.deleteTeam
  );

export default router;