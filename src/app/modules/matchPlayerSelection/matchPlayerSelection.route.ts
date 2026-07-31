import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { MatchPlayerSelectionController } from "./matchPlayerSelection.controller";

const router = express.Router();

// CREATE (Only assigned Manager of the team or Admin/SuperAdmin)
router.post(
  "/",
  auth(USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  MatchPlayerSelectionController.createSelection
);

// GET ALL
router.get("/", MatchPlayerSelectionController.getAllSelections);

router.get(
  "/filter",
  MatchPlayerSelectionController.getPlayersByMatchAndTeam
);

// GET SINGLE
router.get("/:id", MatchPlayerSelectionController.getSingleSelection);

// UPDATE (Only assigned Manager of the team or Admin/SuperAdmin)
router.patch(
  "/:id",
  auth(USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  MatchPlayerSelectionController.updateSelection
);

// DELETE (Only assigned Manager of the team or Admin/SuperAdmin)
router.delete(
  "/:id",
  auth(USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  MatchPlayerSelectionController.deleteSelection
);

export default router;