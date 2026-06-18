import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { MatchController } from './match.controller';

const router = express.Router();


router.get(
  '/manager-upcoming-matches',
  auth(USER_ROLES.MANAGER),
  MatchController.getUpcomingMatchesForManager,
);
// CREATE + GET ALL
router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    MatchController.createMatch
  )
  .get(MatchController.getAllMatches);

router.get(
  "/my-matches",
  auth(USER_ROLES.REFEREE),
  MatchController.getMatchesForReferee,
);


router.patch(
  '/review/:id',
  auth(USER_ROLES.REFEREE),
  MatchController.addMatchReview,
);

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
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.REFEREE),
  MatchController.toggleMatchStatus
);




export default router;