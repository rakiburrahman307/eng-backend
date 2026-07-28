import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { VenueCategoryController } from './venueCategory.controller';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    VenueCategoryController.createCategory
  )
  .get(VenueCategoryController.getAllCategories);

router.get(
  '/admin',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  VenueCategoryController.getAllCategoriesForAdmin
);

router
  .route('/:id')
  .get(VenueCategoryController.getSingleCategory)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    VenueCategoryController.updateCategory
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    VenueCategoryController.deleteCategory
  );

export default router;
