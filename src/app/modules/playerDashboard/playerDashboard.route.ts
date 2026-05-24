import express from "express";
import { PlayerDashboardController } from "./playerDashboard.controller";

const router = express.Router();

// PLAYER DASHBOARD
router.get("/:playerId", PlayerDashboardController.getPlayerDashboard);

export default router;