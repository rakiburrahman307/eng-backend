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

    // 🚨 AUTH CHECK
    if (!user) {
        throw new ApiError(401, "Unauthorized user - token invalid or missing");
    }

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
    const role = user.role;

    // 🚨 FILES (single field: document)
    const files = req.files as any;

    const documentFiles =
        files?.document?.map((file: any) => {
            // 🖼 image file
            if (file.mimetype.startsWith("image/")) {
                return `/images/${file.filename}`;
            }

            // 📄 document file (pdf/doc/etc)
            return `/documents/${file.filename}`;
        }) || [];

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

    // 🔥 REQUIRED FIELD CHECK
    const requiredFields = [
        "firstName",
        "lastName",
        "dateOfBirth",
        
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

    // 🚨 PLAYER ROLE SPECIFIC VALIDATION
    if (role === "PLAYER") {
    const playerRequiredFields = ["ageGroup", "selectTeam"];

    const missingPlayerFields = playerRequiredFields.filter(
        (field) => !parsedData?.[field]
    );

    if (missingPlayerFields.length > 0) {
        throw new ApiError(
        400,
        `Player must provide: ${missingPlayerFields.join(", ")}`
        );
    }
    }

    // 🚀 FINAL PAYLOAD
    const data = {
        userId,
        document: documentFiles, // 👈 BOTH IMAGE + DOC IN ONE FIELD
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
  if (!user?._id) {
    throw new ApiError(
      401,
      "Unauthorized user - token invalid or missing"
    );
  }

  const userId = user._id;

  // ✅ FILE HANDLE
  const files = req.files as any;

  let documentFiles: string[] = [];

  if (files?.document?.length) {
    documentFiles = files.document.map((file: any) => {
      // 🖼 IMAGE
      if (file.mimetype.startsWith("image/")) {
        return `/images/${file.filename}`;
      }

      // 📄 DOCUMENT
      return `/documents/${file.filename}`;
    });
  }

  // ✅ SAFE JSON PARSE
  let parsedData: any = {};

  try {
    parsedData =
      typeof req.body.data === "string"
        ? JSON.parse(req.body.data)
        : req.body.data || req.body;
  } catch (error) {
    throw new ApiError(
      400,
      "Invalid JSON format in request body"
    );
  }

  // ✅ UPDATE DATA
  const updateData: any = {
    ...parsedData,
  };

  // ✅ DOCUMENT ADD
  if (documentFiles.length > 0) {
    updateData.document = documentFiles;
  }

  // 🔥 UPDATE PLAYER
  const result = await UserService.updatePlayerByUserId(
    userId,
    updateData
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Player updated successfully",
    data: result,
  });
});


const getPlayer = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  if (!user?._id) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Unauthorized user"
    );
  }

  const result = await UserService.getPlayerByUserId(
    user._id
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Player retrieved successfully",
    data: result,
  });
});

const getManager = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as any;

    if (!user?._id) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Unauthorized user'
      );
    }

    const result =
      await UserService.getManagerByUserId(
        user._id
      );

    return sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Manager retrieved successfully',
      data: result,
    });
  }
);



const getReferee = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as any;

    if (!user?._id) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Unauthorized user'
      );
    }

    const result =
      await UserService.getRefereeByUserId(
        user._id
      );

    return sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Referee retrieved successfully',
      data: result,
    });
  }
);


const getOtherClub = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as any;

    if (!user?._id) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Unauthorized user'
      );
    }

    const result =
      await UserService.getOtherClubByUserId(
        user._id
      );

    return sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Other club retrieved successfully',
      data: result,
    });
  }
);



const getOtherClubByUserId = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    const result =
      await UserService.getOtherClubByUserIdUserId(
        userId as string
      );

    return sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Other club retrieved successfully',
      data: result,
    });
  }
);




export const UserController = { 
    createUser, 
    createAdmin, 
    getUserProfile, 
    updateProfile,
    createPlayer,
    updatePlayer,
    getPlayer,
    getManager,
    getReferee,
    getOtherClub,
    getOtherClubByUserId
};