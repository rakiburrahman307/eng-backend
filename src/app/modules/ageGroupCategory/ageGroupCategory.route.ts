import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { AgeGroupCategoryController } from './ageGroupCategory.controller';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AgeGroupCategoryController.createCategory
  )
  .get(AgeGroupCategoryController.getAllCategories);

router.get(
  '/admin',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AgeGroupCategoryController.getAllCategoriesForAdmin
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
