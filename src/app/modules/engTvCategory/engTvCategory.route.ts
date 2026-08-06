import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { EngTvCategoryController } from './engTvCategory.controller';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    EngTvCategoryController.createCategory
  )
  .get(EngTvCategoryController.getAllCategories);

router.get(
  '/admin',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  EngTvCategoryController.getAllCategoriesForAdmin
);

// REARRANGE — must be registered before /:id to avoid route conflict
router.patch(
  '/rearrange',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  EngTvCategoryController.rearrangeCategories
);

router
  .route('/:id')
  .get(EngTvCategoryController.getSingleCategory)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    EngTvCategoryController.updateCategory
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    EngTvCategoryController.deleteCategory
  );

export default router;
