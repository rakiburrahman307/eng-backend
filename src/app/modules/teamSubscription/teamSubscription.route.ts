import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { TeamSubscriptionController } from "./teamSubscription.controller";

const router = express.Router();

// Toggle subscription (bell icon on/off)
router.post(
  "/toggle",
  auth(),
  TeamSubscriptionController.toggleSubscription
);

router.post(
  "/toggle/:teamId",
  auth(),
  TeamSubscriptionController.toggleSubscription
);

// Get subscription status for a team
router.get(
  "/status/:teamId",
  auth(),
  TeamSubscriptionController.getSubscriptionStatus
);

// Get all subscribed teams for the logged-in user
router.get(
  "/my-subscriptions",
  auth(),
  TeamSubscriptionController.getMySubscribedTeams
);

// Get total subscriber count for a team
router.get(
  "/subscribers-count/:teamId",
  TeamSubscriptionController.getTeamSubscribersCount
);

// Broadcast an announcement notification to all subscribers of a team (Admin / Super Admin / Manager)
router.post(
  "/broadcast/:teamId",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER),
  TeamSubscriptionController.broadcastToSubscribers
);

export const TeamSubscriptionRoutes = router;
