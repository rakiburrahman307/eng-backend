import express from "express";
import auth from "../../middlewares/auth";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLES } from "../../../enums/user";
import { PlayerController } from "./player.controller";
import { UserValidation } from "../user/user.validation";

const parseFormDataBody = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.body?.data && typeof req.body.data === 'string') {
    try {
      const parsed = JSON.parse(req.body.data);
      req.body = { ...req.body, ...parsed };
    } catch (e) {
      // ignore
    }
  }
  next();
};

const router = express.Router();

// ========================== PARENT PLAYER ROUTES ==========================

// 1. ADD PLAYER BY PARENT
router.post(
  "/",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.PLAYER, USER_ROLES.MANAGER, USER_ROLES.OTHER_CLUBS),
  fileUploadHandler(),
  parseFormDataBody,
  validateRequest(UserValidation.createPlayerZodSchema),
  PlayerController.createPlayerByParent
);

// 2. GET ALL PLAYERS OF AUTHENTICATED PARENT
router.get(
  "/my-players",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.PLAYER, USER_ROLES.MANAGER, USER_ROLES.OTHER_CLUBS),
  PlayerController.getMyPlayers
);

// 3. GET SINGLE PLAYER BY PARENT
router.get(
  "/my-players/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.PLAYER, USER_ROLES.MANAGER, USER_ROLES.OTHER_CLUBS),
  PlayerController.getPlayerById
);

// 4. UPDATE PLAYER BY PARENT
router.patch(
  "/my-players/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.PLAYER, USER_ROLES.MANAGER, USER_ROLES.OTHER_CLUBS),
  fileUploadHandler(),
  PlayerController.updatePlayerByParent
);

// 5. DELETE PLAYER BY PARENT
router.delete(
  "/my-players/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.PLAYER, USER_ROLES.MANAGER, USER_ROLES.OTHER_CLUBS),
  PlayerController.deletePlayerByParent
);

// ========================== ADMIN APPROVAL ROUTES ==========================

// 6. GET PENDING PLAYERS FOR ADMIN REVIEW
router.get(
  "/admin/pending",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  PlayerController.getPendingPlayersForAdmin
);

// 7. APPROVE PLAYER BY ADMIN
router.patch(
  "/admin/:id/approve",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  PlayerController.approvePlayerByAdmin
);

// 8. REJECT PLAYER BY ADMIN
router.patch(
  "/admin/:id/reject",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  PlayerController.rejectPlayerByAdmin
);

// ========================== EXISTING PUBLIC/LISTING ROUTES ==========================

// GET ALL PLAYERS
router.get("/", auth(false), PlayerController.getAllPlayers);

// FILTER PLAYERS BY TEAM AND/OR POSITION
router.get("/filter", auth(false), PlayerController.getFilteredPlayers);

// UPDATE PLAYER DATA (ADMIN & SUPER_ADMIN)
router.patch(
  "/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  fileUploadHandler(),
  PlayerController.updatePlayerByAdmin
);

export default router;