import express from 'express';
import { MatchEvaluationController } from './refereeRating.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';


const router = express.Router();

// CREATE (REFEREE / MANAGER SUBMIT)
router.post(
  '/',
  auth(USER_ROLES.MANAGER, USER_ROLES.REFEREE, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  MatchEvaluationController.createEvaluation
);

// GET ALL (supports ?match=matchId)
router.get('/', MatchEvaluationController.getAllEvaluations);

// GET EVALUATION BY MATCH ID
router.get('/match/:matchId', MatchEvaluationController.getEvaluationByMatch);

// GET SINGLE
router.get('/:id', MatchEvaluationController.getSingleEvaluation);

export default router;