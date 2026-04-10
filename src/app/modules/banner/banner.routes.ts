import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { BannerController } from "./banner.controller";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
const router = express.Router();

router.route('/')
    .post(
        auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), 
        fileUploadHandler(), 
        BannerController.createBanner
    )
    .get(
        auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), 
        BannerController.getAllBanner
    );

router.route('/:id')
    .patch(
        auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), 
        fileUploadHandler(), 
        BannerController.updateBanner
    )
    .delete(
        auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), 
        BannerController.deleteBanner
    );


export const BannerRoutes = router;