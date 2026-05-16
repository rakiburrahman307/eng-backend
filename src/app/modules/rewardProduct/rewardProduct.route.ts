import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploaderHandler';
import { RewardProductController } from './rewardProduct.controller';


const router = express.Router();

// CREATE + GET ALL
router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    RewardProductController.createRewardProduct
  )
  .get( RewardProductController.getAllRewardProducts);

// SINGLE + UPDATE + DELETE
router
  .route('/:id')
  .get( RewardProductController.getSingleRewardProduct)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    RewardProductController.updateRewardProduct
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    RewardProductController.deleteRewardProduct
  );

// TOGGLE STATUS
router
  .route('/:id/toggle-status')
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    RewardProductController.toggleRewardProductStatus
  );

export default router;