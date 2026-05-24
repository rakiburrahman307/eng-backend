// user.route.ts

import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { UserManagementController } from './userManagement.controller';

const router = express.Router();

// GET ALL USERS
router
  .route('/')
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    UserManagementController.getAllUsers
  );

// TOGGLE VERIFIED
router
  .route('/toggle-verified/:id')
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    UserManagementController.toggleVerified
  );

// DELETE USER
router
  .route('/:id')
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    UserManagementController.deleteUser
);
  

router.get("/referees", UserManagementController.getAllReferees);

export default router;