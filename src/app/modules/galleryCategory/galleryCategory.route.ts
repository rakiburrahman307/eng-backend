import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { GalleryCategoryController } from './galleryCategory.controller';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    GalleryCategoryController.createCategory
  )
  .get(GalleryCategoryController.getAllCategories);

router.get(
  '/admin',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  GalleryCategoryController.getAllCategoriesForAdmin
);

router
  .route('/:id')
  .get(GalleryCategoryController.getSingleCategory)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    GalleryCategoryController.updateCategory
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    GalleryCategoryController.deleteCategory
  );

export default router;
