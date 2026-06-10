import express from "express";
import { TeamDashboardController } from "./teamDashboard.controller";

const router = express.Router();

// TEAM DASHBOARD
router.get("/:teamId", TeamDashboardController.getTeamDashboard);

router.get(
  "/overview/:teamId",
  TeamDashboardController.getClubOverview
);

export default router;