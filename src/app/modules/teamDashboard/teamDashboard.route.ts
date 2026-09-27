import express from "express";
import auth from "../../middlewares/auth";
import { TeamDashboardController } from "./teamDashboard.controller";

const router = express.Router();

// TEAM DASHBOARD (auth(false) allows guest view while populating req.user if logged in)
router.get("/:teamId", auth(false), TeamDashboardController.getTeamDashboard);

router.get(
  "/overview/:teamId",
  TeamDashboardController.getClubOverview
);

export default router;