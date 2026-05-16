import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { LeagueController } from './league.controller';

const router = express.Router();

// CREATE + GET ALL
router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LeagueController.createLeague
  )
  .get(auth(), LeagueController.getAllLeagues);

// SINGLE + UPDATE + DELETE
router
  .route('/:id')
  .get(auth(), LeagueController.getSingleLeague)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LeagueController.updateLeague
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LeagueController.deleteLeague
  );

export default router;