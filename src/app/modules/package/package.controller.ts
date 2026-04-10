import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { PackageService } from "./package.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";

const createPackage = catchAsync(async(req: Request, res: Response)=>{
    const result = await PackageService.createPackageToDB(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package created Successfully",
        data: result
    })
})

const updatePackage = catchAsync(async(req: Request, res: Response)=>{
    const result = await PackageService.updatePackageToDB(req.params.id, req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package updated Successfully",
        data: result
    })
})

const getPackage = catchAsync(async(req: Request, res: Response)=>{
    const result = await PackageService.getPackageFromDB(req.query.paymentType as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package Retrieved Successfully",
        data: result
    })
})

const packageDetails = catchAsync(async(req: Request, res: Response)=>{
    const result = await PackageService.getPackageDetailsFromDB(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package Details Retrieved Successfully",
        data: result
    })
})


const deletePackage = catchAsync(async(req: Request, res: Response)=>{
    const result = await PackageService.deletePackageToDB(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package Deleted Successfully",
        data: result
    })
})

export const PackageController = {
    createPackage,
    updatePackage,
    getPackage,
    packageDetails,
    deletePackage
}