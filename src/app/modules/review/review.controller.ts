import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ReviewService } from "./review.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";


const createReview = catchAsync(async(req:Request, res:Response)=>{
    const result = await ReviewService.createReviewToDB(req.body);

    sendResponse(res, {
        statusCode : StatusCodes.OK,
        success: true,
        message: "Review Created Successfully",
        data: result
    })
})

export  const ReviewController = {createReview}