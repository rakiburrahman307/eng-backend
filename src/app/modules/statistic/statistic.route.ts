import express from "express";
import { StatisticController } from "./statistic.controller";


const router = express.Router();

router.get(
  "/top-player/:leagueId",
  StatisticController.getTopPlayer
);

router.get(
  "/player-stats/:playerId/:leagueId",
  StatisticController.getPlayerSeasonStats
);

export default router;