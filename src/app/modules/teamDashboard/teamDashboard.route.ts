import express from "express";
import { TeamDashboardController } from "./teamDashboard.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

// TEAM DASHBOARD (auth(false) allows guest view while populating req.user if logged in)
router.get("/:teamId", auth(false), TeamDashboardController.getTeamDashboard);

router.get(
  "/overview/:teamId",
  TeamDashboardController.getClubOverview
);

export default router;