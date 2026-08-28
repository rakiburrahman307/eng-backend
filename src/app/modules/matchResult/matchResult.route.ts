import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { MatchResultController } from './matchResult.controller';

const router = express.Router();

// CREATE + GET ALL
router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.REFEREE, USER_ROLES.MANAGER),
    MatchResultController.createMatchResult
  )
  .get(MatchResultController.getAllMatchResults);


 // MATCH WISE RESULT
router.get(
  '/match/:matchId',
  MatchResultController.getMatchWiseResults
);
// SINGLE + UPDATE + DELETE
router
  .route('/:id')
  .get(MatchResultController.getSingleMatchResult)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.REFEREE, USER_ROLES.MANAGER),
    MatchResultController.updateMatchResult
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    MatchResultController.deleteMatchResult
  );



export default router;