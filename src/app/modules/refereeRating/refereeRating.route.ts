import express from 'express';
import { MatchEvaluationController } from './refereeRating.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';


const router = express.Router();

// CREATE (REFEREE SUBMIT)
router.post('/',auth(USER_ROLES.REFEREE), MatchEvaluationController.createEvaluation);

// GET ALL
router.get('/', MatchEvaluationController.getAllEvaluations);

// GET SINGLE
router.get('/:id', MatchEvaluationController.getSingleEvaluation);

export default router;