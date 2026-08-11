import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { UserManagementController } from "./userManagement.controller";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";

const router = express.Router();

// GET ALL USERS
router.get(
  "/",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER, USER_ROLES.OTHER_CLUBS),
  UserManagementController.getAllUsers
);

// GET USER ANALYTICS
router.get(
  "/analytics",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER, USER_ROLES.OTHER_CLUBS),
  UserManagementController.getUserAnalytics
);

// GET REFEREES
router.get("/referees", UserManagementController.getAllReferees);

// GET MANAGERS
router.get("/managers", UserManagementController.getAllManagers);

// TOGGLE VERIFIED
router.patch(
  "/toggle-verified/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  UserManagementController.toggleVerified
);

// UPDATE USER ROLE
router.patch(
  "/role/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  UserManagementController.updateUserRole
);

// UPDATE USER PROFILE BY ADMIN
router.patch(
  "/update-profile/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  fileUploadHandler(),
  UserManagementController.updateUserProfileByAdmin
);

router.patch(
  "/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  fileUploadHandler(),
  UserManagementController.updateUserProfileByAdmin
);

// DELETE USER
router.delete(
  "/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  UserManagementController.deleteUser
);

export default router;