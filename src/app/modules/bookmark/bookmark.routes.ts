import express from "express";
import { BookmarkController } from "./bookmark.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";

const router = express.Router();

router.get("/", auth(USER_ROLES.USER), BookmarkController.getBookmark);
router.post("/:id", auth(USER_ROLES.USER), BookmarkController.toggleBookmark);

export const BookmarkRoutes = router;
