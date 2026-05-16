import express from 'express';
import { PlayerStatsController } from './playerStats.controller';

const router = express.Router();

// GET ALL (LEADERBOARD)
router.route('/').get(PlayerStatsController.getAllPlayerStats);

// GET SINGLE PLAYER STATS
router.route('/:playerId').get(PlayerStatsController.getSinglePlayerStats);

// ADMIN UPDATE
router.route('/:playerId').patch(PlayerStatsController.updatePlayerStats);

export default router;