import { model, Schema } from "mongoose";
import { IReview, ReviewModel } from "./review.interface";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";

const Service:any = [] ;

const reviewSchema = new Schema<IReview, ReviewModel>(
    {
        customer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        barber: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        service: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },
        comment: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true
        },

    },
    { timestamps: true }
);


//check user
reviewSchema.post('save', async function () {

    const review = this as IReview;

    if (review.rating < 1 || review.rating > 5) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid rating value. Try give rating between 1 to 5");
    }

    const isExistService = await Service.findById(review.service);
    if (!isExistService) {
        throw new Error("Service not found");
    }

    const ratingCount = Number(isExistService.totalRating) + 1;

    let newRating;
    if (isExistService.rating === null || isExistService.rating === 0) {
        newRating = review.rating;
    } else {
        // Calculate the new rating based on previous ratings
        newRating = ((Number(isExistService.rating) * Number(isExistService.totalRating)) + Number(review.rating)) / ratingCount;
    }

    const updatedService = await Service.findByIdAndUpdate(
        { _id: review.service },
        { rating: parseFloat(newRating.toFixed(2)), totalRating: ratingCount },
        { new: true }
    )

    if (!updatedService) {
        throw new ApiError( StatusCodes.BAD_REQUEST, "Failed to update service");
    }
});

export const Review = model<IReview, ReviewModel>("Review", reviewSchema);