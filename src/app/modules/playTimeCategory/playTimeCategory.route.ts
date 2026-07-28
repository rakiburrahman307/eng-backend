import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { PlayTimeCategoryController } from './playTimeCategory.controller';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    PlayTimeCategoryController.createCategory
  )
  .get(PlayTimeCategoryController.getAllCategories);

router.get(
  '/admin',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  PlayTimeCategoryController.getAllCategoriesForAdmin
);

router
  .route('/:id')
  .get(PlayTimeCategoryController.getSingleCategory)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    PlayTimeCategoryController.updateCategory
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    PlayTimeCategoryController.deleteCategory
  );

export default router;
