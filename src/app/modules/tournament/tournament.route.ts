import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { TournamentController } from './tournament.controller';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    TournamentController.createTournament
  )
  .get(TournamentController.getAllTournaments);

router
  .route('/:id')
  .get(TournamentController.getSingleTournament)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    TournamentController.updateTournament
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    TournamentController.deleteTournament
  );

export default router;
