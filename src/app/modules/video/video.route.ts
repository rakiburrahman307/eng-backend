import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import fileUploadHandler from '../../middlewares/fileUploaderHandler';
import { VideoController } from './video.controller';

const router = express.Router();

// CREATE + GET ALL
router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    VideoController.createVideo
  )
  .get(auth(), VideoController.getAllVideos);

// SINGLE + UPDATE + DELETE
router
  .route('/:id')
  .get(auth(), VideoController.getSingleVideo)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    VideoController.updateVideo
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    VideoController.deleteVideo
  );

// TOGGLE STATUS
router
  .route('/:id/toggle-status')
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    VideoController.toggleVideoStatus
  );

export default router;