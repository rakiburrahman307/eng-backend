import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { PackageService } from "./package.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";

const createPackage = catchAsync(async (req: Request, res: Response) => {
    const result = await PackageService.createPackageToDB(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package created Successfully",
        data: result
    });
});

const updatePackage = catchAsync(async (req: Request, res: Response) => {
    const result = await PackageService.updatePackageToDB(
        req.params.id as string,
        req.body
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package updated Successfully",
        data: result
    });
});

const getPackage = catchAsync(async (req: Request, res: Response) => {
  const { paymentType, userType } = req.query;

  const result = await PackageService.getPackageFromDB(
    paymentType as string,
    userType as string
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Package Retrieved Successfully",
    data: result,
  });
});

const packageDetails = catchAsync(async(req: Request, res: Response)=>{
    const result = await PackageService.getPackageDetailsFromDB(req.params.id as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package Details Retrieved Successfully",
        data: result
    })
})


const deletePackage = catchAsync(async(req: Request, res: Response)=>{
    const result = await PackageService.deletePackageToDB(req.params.id as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package Deleted Successfully",
        data: result
    })
})


const togglePackageStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await PackageService.togglePackageStatusToDB(req.params.id as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package status toggled successfully",
        data: result
    });
});

const getActivePackages = catchAsync(async (req: Request, res: Response) => {
  const { status, userType } = req.query;

  const result = await PackageService.getActivePackagesFromDB({
    status: status as string | undefined,
    userType: userType as string | undefined,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Active packages retrieved successfully",
    data: result,
  });
});

const getCheckoutUrl = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (!user || !user.email) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User email is required');
    }

    const result = await PackageService.getCheckoutUrlFromDB(
        req.params.id as string,
        user._id.toString(),
        user.email
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Checkout URL generated successfully',
        data: result,
    });
});

export const PackageController = {
    createPackage,
    updatePackage,
    getPackage,
    packageDetails,
    deletePackage,
    togglePackageStatus,
    getActivePackages,
    getCheckoutUrl,
}