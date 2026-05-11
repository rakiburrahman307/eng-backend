import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { EventController } from './event.controller';
import fileUploadHandler from '../../middlewares/fileUploaderHandler';

const router = express.Router();

// CREATE + GET ALL
router
  .route('/')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    EventController.createEvent
  )
  .get(EventController.getAllEvents);

// SINGLE + UPDATE + DELETE
router
  .route('/:id')
  .get(EventController.getSingleEvent)
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    fileUploadHandler(),
    EventController.updateEvent
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    EventController.deleteEvent
  );

export default router;