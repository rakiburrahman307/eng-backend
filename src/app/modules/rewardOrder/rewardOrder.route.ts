import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { RewardOrderController } from './rewardOrder.controller';


const router = express.Router();

// PLAYER BUY PRODUCT
router
  .route('/')
  .post(
    auth(USER_ROLES.PLAYER),
    RewardOrderController.createRewardOrder
  )
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    RewardOrderController.getAllRewardOrders
  );

// PLAYER MY ORDERS
router.route('/my-orders').get(
  auth(USER_ROLES.PLAYER),
  RewardOrderController.getMyRewardOrders
);

// SINGLE ORDER
router
  .route('/:id')
  .get(auth(), RewardOrderController.getSingleRewardOrder);

// APPROVE
router.route('/:id/approve').patch(
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  RewardOrderController.approveRewardOrder
);

// REJECT
router.route('/:id/reject').patch(
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  RewardOrderController.rejectRewardOrder
);

// DELIVERED
router.route('/:id/delivered').patch(
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  RewardOrderController.deliveredRewardOrder
);

export default router;