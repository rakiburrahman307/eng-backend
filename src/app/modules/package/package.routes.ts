import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { PackageController } from "./package.controller";
import validateRequest from "../../middlewares/validateRequest";
import { PackageValidation } from "./package.validation";
import fileUploadHandler from "../../middlewares/fileUploaderHandler";
const router = express.Router()

router
    .route("/")
    .post(
        fileUploadHandler(), 
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), 
        validateRequest(PackageValidation.createPackageZodSchema), 
        PackageController.createPackage
    )
    .get(PackageController.getPackage)

router
    .route("/:id")
    .patch(auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), PackageController.updatePackage)
    .delete(auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), PackageController.deletePackage)

    router.patch(
    "/toggle/:id",
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    PackageController.togglePackageStatus
    
    );

    router.get("/all", PackageController.getActivePackages)

// Auto-generate checkout URL with client_reference_id from logged-in user's token
router.get(
    "/:id/checkout",
    auth(USER_ROLES.PLAYER, USER_ROLES.REFEREE, USER_ROLES.MANAGER),
    PackageController.getCheckoutUrl
);

export default router;