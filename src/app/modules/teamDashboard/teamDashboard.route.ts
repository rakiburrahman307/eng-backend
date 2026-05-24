import express from "express";
import { TeamDashboardController } from "./teamDashboard.controller";

const router = express.Router();

// TEAM DASHBOARD
router.get("/:teamId", TeamDashboardController.getTeamDashboard);

export default router;