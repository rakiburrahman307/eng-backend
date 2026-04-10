import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { UserService } from './user.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import ApiError from '../../../errors/ApiErrors';

// register user
const createUser = catchAsync( async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    const result = await UserService.createUserToDB(userData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Your account has been successfully created. Verify Your Email By OTP. Check your email',
    })
});

// register admin
const createAdmin = catchAsync( async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;
    const result = await UserService.createAdminToDB(userData);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Admin created successfully',
        data: result
    });
});

// retrieved user profile
const getUserProfile = catchAsync(async (req: Request, res: Response) => {
    console.log("🔥 PROFILE API HIT");
    console.log("📦 req.user:", req.user);

    const user = req.user;

    if (!user) {
        return sendResponse(res, {
            success: false,
            statusCode: 200,
            message: "Data not found",
            data: null
        });
    }

    const result = await UserService.getUserProfileFromDB(user);

    if (!result) {
        return sendResponse(res, {
            success: false,
            statusCode: 200,
            message: "Data not found",
            data: null
        });
    }

    return sendResponse(res, {
        success: true,
        statusCode: 200,
        message: "Profile data retrieved successfully",
        data: result
    });
});

//update profile
const updateProfile = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;

    let profile;

    if (req.files && 'image' in req.files && req.files.image[0]) {
        profile = `/images/${req.files.image[0].filename}`;
    }

    // ✅ parse JSON string
    let parsedData = {};
    if (req.body.data) {
        parsedData = JSON.parse(req.body.data);
    }

    const data = {
        profile,
        ...parsedData,
    };

    const result = await UserService.updateProfileToDB(user, data);

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Profile updated successfully',
        data: result
    });
});


const createPlayer = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;

    // 🚨 AUTH CHECK
    if (!user?._id) {
        throw new ApiError(401, "Unauthorized user - token invalid or missing");
    }

    const userId = user._id;

    // 🚨 FILE
    const files = req.files as any;
    const documentFile = files?.document?.[0]
        ? `/documents/${files.document[0].filename}`
        : null;

    // 🚨 BODY CHECK
    if (!req.body) {
        throw new ApiError(400, "Request body is missing");
    }

    // 🚀 PARSE DATA
    let parsedData: any = {};

    try {
        parsedData =
            typeof req.body.data === "string"
                ? JSON.parse(req.body.data)
                : req.body.data || req.body;
    } catch {
        throw new ApiError(400, "Invalid JSON format in request body");
    }

    // 🔥 REQUIRED FIELD CHECK (IMPORTANT)
    const requiredFields = [
        "firstName",
        "lastName",
        "dateOfBirth",
        "selectGroup",
    ];

    const missingFields = requiredFields.filter(
        (field) => !parsedData?.[field]
    );

    if (missingFields.length > 0) {
        throw new ApiError(
            400,
            `Missing required fields: ${missingFields.join(", ")}`
        );
    }

    // 🚀 FINAL PAYLOAD
    const data = {
        userId,
        document: documentFile,
        ...parsedData,
    };

    const result = await UserService.createPlayerToDB(data);

    return sendResponse(res, {
        success: true,
        statusCode: StatusCodes.CREATED,
        message: "Player created successfully",
        data: result,
    });
});


const updatePlayer = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  // ✅ AUTH CHECK
  if (!user || !user._id) {
    throw new ApiError(401, "Unauthorized user - token invalid or missing");
  }

  const userId = user._id; // 🔥 FROM TOKEN

  let documentFile: string | null = null;

  const files = req.files as any;

  if (files?.document?.[0]) {
    documentFile = `/documents/${files.document[0].filename}`;
  }

  // ✅ SAFE JSON PARSE
  let parsedData: any = {};

  if (req.body?.data) {
    try {
      parsedData =
        typeof req.body.data === "string"
          ? JSON.parse(req.body.data)
          : req.body.data;
    } catch (error) {
      throw new ApiError(400, "Invalid JSON format in 'data' field");
    }
  }

  const updateData: any = {
    ...parsedData,
  };

  if (documentFile) {
    updateData.document = documentFile;
  }

  // 🔥 UPDATE BY TOKEN USER
  const result = await UserService.updatePlayerByUserId(userId, updateData);

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Player updated successfully",
    data: result,
  });
});

export const UserController = { 
    createUser, 
    createAdmin, 
    getUserProfile, 
    updateProfile,
    createPlayer,
    updatePlayer
};