import express, { NextFunction, Request, Response } from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { ReviewController } from "./review.controller";
import validateRequest from "../../middlewares/validateRequest";
import { ReviewValidation } from "./review.validation";
const router = express.Router();

router.post("/",
    auth(USER_ROLES.USER),
    validateRequest(ReviewValidation.reviewZodSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {rating, ...othersData } = req.body;

            req.body = { ...othersData, customer: req.user.id, rating: Number(rating)};
            next();

        } catch (error) {
            console.log(error)
            return res.status(500).json({ message: "Failed to convert string to number" });
        }
    },
    auth(USER_ROLES.USER), ReviewController.createReview
);


export const ReviewRoutes = router;