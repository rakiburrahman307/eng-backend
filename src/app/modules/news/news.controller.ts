import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { NewsService } from './news.service';

// CREATE (TOKEN USER ID)
const createNews = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  console.log("🔥 USER:", user);

  const files = req.files as {
    image?: Express.Multer.File[];
  };

  const image = files?.image?.[0];

  console.log("🖼️ IMAGE FILE:", image);

  const data = req.body?.data ? JSON.parse(req.body.data) : {};

  console.log("📦 RAW DATA:", data);

  const payload: any = {
    ...data,
  };

  // ❌ remove user publish date input
  delete payload.publishDateTime;

  console.log("🧹 AFTER DELETE publishDateTime:", payload);

  // ✅ image path clean
  if (image) {
    payload.image = image.path
      .replace(/\\/g, '/')
      .split('uploads')[1];
  }

  console.log("🖼️ FINAL IMAGE PATH:", payload.image);

  // 🔥 auto publish logic
  if (payload.status === 'publish') {
    payload.publishDateTime = new Date();
  } else {
    payload.publishDateTime = null;
  }

  console.log("⏰ FINAL PUBLISH DATE:", payload.publishDateTime);

  console.log("🚀 FINAL PAYLOAD BEFORE DB:", payload);

  const result = await NewsService.createNewsToDB(payload, user._id);

  console.log("✅ CREATED RESULT:", result);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'News created successfully',
    data: result,
  });
});

// GET ALL (ROLE BASED)
const getAllNews = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await NewsService.getAllNewsFromDB(user.role);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'News retrieved successfully',
    data: result,
  });
});

// MY NEWS (TOKEN BASED)
const getMyNews = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await NewsService.getMyNewsFromDB(user._id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My news retrieved successfully',
    data: result,
  });
});


// GET SINGLE (NO PARAM ID VERSION -> optional, token based user flow if needed)
const getSingleNews = catchAsync(async (req: Request, res: Response) => {
    const result = await NewsService.getSingleNewsFromDB(req.params.id as string);
    
    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'News retrieved successfully',
        data: result,
    });
});

// UPDATE (NO OWNER PARAM)
const updateNews = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const user = req.user as any;
  const userId = user._id;

  console.log("🔐 USER FROM TOKEN:", user);
  console.log("🆔 USER ID:", userId);

  const files = req.files as {
    image?: Express.Multer.File[];
  };

  const image = files?.image?.[0];

  const data = req.body?.data ? JSON.parse(req.body.data) : {};

  console.log("📦 DATA:", data);
  console.log("🖼️ IMAGE:", image);

  const payload: any = {
    ...data,
  };

  if (image) {
    payload.image = image.path
      .replace(/\\/g, '/')
      .split('uploads')[1];
  }

  console.log("🚀 FINAL PAYLOAD:", payload);

  const result = await NewsService.updateNewsToDB(
    id,
    userId,
    payload
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'News updated successfully',
    data: result,
  });
});

// DELETE
const deleteNews = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await NewsService.deleteNewsFromDB(
    req.params.id as string,
    user._id
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'News deleted successfully',
    data: result,
  });
});

// TOGGLE
const toggleNewsStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await NewsService.toggleNewsStatusToDB(req.params.id as string, user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'News status toggled successfully',
    data: result,
  });
});

export const NewsController = {
  createNews,
  getAllNews,
  getMyNews,
  getSingleNews,
  updateNews,
  deleteNews,
  toggleNewsStatus,
};