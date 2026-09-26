import express from "express";
import auth from "../../middlewares/auth";
import { ROLE_GROUPS, USER_ROLES } from "../../../enums/user";
import { CoinTransactionController } from "./coinTransaction.controller";

const router = express.Router();

// 📜 USER: View logged-in player's own coin statement & history
router.get(
  "/my-history",
  auth(...ROLE_GROUPS.All),
  CoinTransactionController.getMyCoinHistory
);

// 🔍 ADMIN: View any player's coin history
router.get(
  "/history/:playerId",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  CoinTransactionController.getPlayerCoinHistoryForAdmin
);

// 🛠️ ADMIN: Manually credit or debit coins with reason
router.patch(
  "/adjust/:playerId",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  CoinTransactionController.adminAdjustCoins
);

export default router;
