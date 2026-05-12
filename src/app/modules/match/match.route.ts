import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { MatchController } from './match.controller';

const router = express.Router();

// CREATE + GET ALL
router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    MatchController.createMatch
  )
  .get(MatchController.getAllMatches);

// SINGLE + UPDATE + DELETE
router
  .route('/:id')
  .get(MatchController.getSingleMatch)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    MatchController.updateMatch
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    MatchController.deleteMatch
  );

// TOGGLE STATUS
router.patch(
  '/toggle-status/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  MatchController.toggleMatchStatus
);

export default router;