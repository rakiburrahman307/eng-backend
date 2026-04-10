import express from 'express'
import { USER_ROLES } from '../../../enums/user'
import auth from '../../middlewares/auth'
import validateRequest from '../../middlewares/validateRequest'
import { CategoryController } from './category.controller'
import { CategoryValidation } from './category.validation'
import fileUploadHandler from '../../middlewares/fileUploaderHandler'
const router = express.Router()

router.post(
  '/create-service',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), fileUploadHandler(),
  validateRequest(CategoryValidation.createCategoryZodSchema),
  CategoryController.createCategory,
)

router
  .route('/:id')
  .patch(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), fileUploadHandler(),
    CategoryController.updateCategory,
  )
  .delete(
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    CategoryController.deleteCategory,
  )

router.get('/',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER),
  CategoryController.getCategories,
)

export const CategoryRoutes = router