import express from "express";
import auth from "../../middlewares/auth";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
import { USER_ROLES } from "../../../enums/user";
import { PlayerController } from "./player.controller";

const router = express.Router();

// GET ALL PLAYERS (auth(false) decodes user if token provided)
router.get("/", auth(false), PlayerController.getAllPlayers);

// ✅ FILTER PLAYERS BY TEAM AND/OR POSITION
router.get("/filter", auth(false), PlayerController.getFilteredPlayers);

// ✏️ UPDATE PLAYER DATA (ADMIN & SUPER_ADMIN)
router.patch(
  "/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  fileUploadHandler(),
  PlayerController.updatePlayerByAdmin
);

export default router;