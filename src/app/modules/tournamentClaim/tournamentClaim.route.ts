import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { TournamentClaimController } from './tournamentClaim.controller';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.PLAYER, USER_ROLES.TOURNAMENT_PLAYER),
    TournamentClaimController.createClaim
  )
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    TournamentClaimController.getAllClaims
  );

router.get(
  '/my-claims',
  auth(USER_ROLES.PLAYER, USER_ROLES.TOURNAMENT_PLAYER),
  TournamentClaimController.getMyClaims
);

router.patch(
  '/:id/review',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  TournamentClaimController.reviewClaim
);

export default router;
