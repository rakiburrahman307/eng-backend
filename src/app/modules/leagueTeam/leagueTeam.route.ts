import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { LeagueTeamController } from './leagueTeam.controller';

const router = express.Router();

// ADD + GET
router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LeagueTeamController.addTeamToLeague
  )
  .get(auth(), LeagueTeamController.getLeagueTeams);

// REMOVE
router
  .route('/:id')
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LeagueTeamController.removeTeamFromLeague
);


// league/:leagueId/teams
router
  .route('/league/:leagueId')
  .get(LeagueTeamController.getTeamsByLeague)
  
  
//remove team 
router
  .route('/league/:leagueId/teams/:teamId')
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    LeagueTeamController.removeSingleTeamFromLeague
  );

export default router;