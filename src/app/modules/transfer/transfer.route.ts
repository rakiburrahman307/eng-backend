import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { TransferController } from './transfer.controller';

const router = express.Router();

//
// CREATE TRANSFER REQUEST
//
router
  .route('/')
  .post(
    auth( USER_ROLES.MANAGER),
    TransferController.createTransfer
  )
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN,),
    TransferController.getAllTransfers
);
  
// GET AVAILABLE PLAYERS FOR TRANSFER (ADMIN / MANAGER)
router.get(
  '/manager-requests',
  auth(USER_ROLES.MANAGER),
  TransferController.getManagerTransferRequests
);

//avilabe

router.get(
  '/available',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER),
  TransferController.getAvailablePlayers
);

//
// MY SENT REQUESTS (PLAYER / MANAGER)
//
router.get(
  '/my-requests',
  auth(USER_ROLES.PLAYER, USER_ROLES.MANAGER, USER_ROLES.OTHER_CLUBS),
  TransferController.getMyTransfers
);

//
// SINGLE TRANSFER
//
router.get(
  '/:id',
  auth(),
  TransferController.getSingleTransfer
);

//
// APPROVE (ADMIN / MANAGER)
//
router.patch(
  '/:id/approve',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER),
  TransferController.approveTransfer
);

//
// REJECT (ADMIN / MANAGER)
//
router.patch(
  '/:id/reject',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER),
  TransferController.rejectTransfer
);

//
// WITHDRAW (PLAYER ONLY)
//
router.patch(
  '/:id/withdraw',
  auth(USER_ROLES.PLAYER, USER_ROLES.OTHER_CLUBS,USER_ROLES.MANAGER),
  TransferController.withdrawTransfer
);

// avilabe player



export default router;