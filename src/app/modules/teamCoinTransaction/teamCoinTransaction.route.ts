import express from "express";
import auth from "../../middlewares/auth";
import { ROLE_GROUPS, USER_ROLES } from "../../../enums/user";
import { TeamCoinTransactionController } from "./teamCoinTransaction.controller";

const router = express.Router();

// 📜 MANAGER: View logged-in manager's team coin history
router.get(
  "/my-team-history",
  auth(...ROLE_GROUPS.All),
  TeamCoinTransactionController.getMyTeamCoinHistory
);

// 🔍 View specific team coin history
router.get(
  "/history/:teamId",
  TeamCoinTransactionController.getTeamCoinHistory
);

// 🛠️ ADMIN: Manually adjust (credit/debit) team coins with reason
router.patch(
  "/adjust/:teamId",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  TeamCoinTransactionController.adminAdjustTeamCoins
);

export const TeamCoinTransactionRoutes = router;
