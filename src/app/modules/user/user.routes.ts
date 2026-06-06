import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import fileUploadHandler from '../../middlewares/fileUploaderHandler';
const router = express.Router();

router.get(
    '/profile',
    auth(USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN, USER_ROLES.PLAYER, USER_ROLES.MANAGER, USER_ROLES.OTHER_CLUBS, USER_ROLES.REFEREE),
    UserController.getUserProfile
);
  
router.post(
    '/create-admin',
    validateRequest(UserValidation.createAdminZodSchema),
    UserController.createAdmin
);

router
    .route('/')
    .post(
        validateRequest(UserValidation.createUserZodSchema),
        UserController.createUser
    )
    .patch(
        auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.PLAYER, USER_ROLES.MANAGER, USER_ROLES.OTHER_CLUBS, USER_ROLES.REFEREE),
        fileUploadHandler(),
        UserController.updateProfile
);
    
router
    .route('/player')
    .get(
    auth(USER_ROLES.PLAYER),
    UserController.getPlayer
  )
    .post(
        auth(USER_ROLES.PLAYER),
        // validateRequest(UserValidation.createPlayerZodSchema),
        fileUploadHandler(),
        UserController.createPlayer
    )
    .patch(
    auth(USER_ROLES.PLAYER ,),
    fileUploadHandler(),
    UserController.updatePlayer
);

  // manager 
router
    .route('/manager')
    .get(
    auth(USER_ROLES.MANAGER),
    UserController.getManager
  )
    .post(
        auth(USER_ROLES.MANAGER),
        // validateRequest(UserValidation.createPlayerZodSchema),
        fileUploadHandler(),
        UserController.createPlayer
    )
    .patch(
    auth(USER_ROLES.MANAGER ,),
    fileUploadHandler(),
    UserController.updatePlayer
);

router
    .route('/referee')
    .get(
    auth(USER_ROLES.REFEREE),
    UserController.getReferee
  )
    .post(
        auth(USER_ROLES.REFEREE),
        // validateRequest(UserValidation.createPlayerZodSchema),
        fileUploadHandler(),
        UserController.createPlayer
    )
    .patch(
    auth(USER_ROLES.REFEREE ,),
    fileUploadHandler(),
    UserController.updatePlayer
);

// other clubs

router
    .route('/other-clubs')
    .get(
    auth(USER_ROLES.OTHER_CLUBS),
    UserController.getOtherClub
  )
    .post(
        auth(USER_ROLES.OTHER_CLUBS),
        // validateRequest(UserValidation.createPlayerZodSchema),
        fileUploadHandler(),
        UserController.createPlayer
    )
    .patch(
    auth(USER_ROLES.OTHER_CLUBS ,),
    fileUploadHandler(),
    UserController.updatePlayer
  );


  router
  .route('/player-details/:userId')
  .get(
    // auth(USER_ROLES.OTHER_CLUBS),
    UserController.getOtherClubByUserId
  );
    



export const UserRoutes = router;