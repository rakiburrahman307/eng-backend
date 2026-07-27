import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { SocialMediaController } from './socialMedia.controller';

const router = express.Router();

router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    SocialMediaController.createSocialMedia
  )
  .get(SocialMediaController.getAllSocialMedia);

router.get(
  '/admin',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  SocialMediaController.getAllSocialMediaForAdmin
);

router
  .route('/:id')
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    SocialMediaController.updateSocialMedia
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    SocialMediaController.deleteSocialMedia
  );

export default router;
