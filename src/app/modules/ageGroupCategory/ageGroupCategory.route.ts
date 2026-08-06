import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { AgeGroupCategoryController } from './ageGroupCategory.controller';

const router = express.Router();

// GET all categories with subcategories (public)
router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AgeGroupCategoryController.createCategory
  )
  .get(AgeGroupCategoryController.getAllCategories);

// GET all categories for admin (with inactive ones)
router.get(
  '/admin',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AgeGroupCategoryController.getAllCategoriesForAdmin
);

// GET subcategories by parent ID
router.get(
  '/:parentId/sub-categories',
  AgeGroupCategoryController.getSubCategories
);

router
  .route('/:id')
  .get(AgeGroupCategoryController.getSingleCategory)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AgeGroupCategoryController.updateCategory
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AgeGroupCategoryController.deleteCategory
  );

export default router;
