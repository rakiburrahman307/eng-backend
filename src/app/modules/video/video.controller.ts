import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { VideoService } from './video.service';

// CREATE
const createVideo = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const files = req.files as {
    video?: Express.Multer.File[];
    image?: Express.Multer.File[];
  };

  const video = files?.video?.[0];
  const thumbnail = files?.image?.[0];

  const data = req.body?.data ? JSON.parse(req.body.data) : {};

  const payload: any = { ...data };

  // 🎥 Video Upload
  if (video) {
    payload.videoUrl = video.path.replace(/\\/g, '/').split('uploads')[1];
  }

  // 🖼️ Thumbnail Upload
  if (thumbnail) {
    payload.thumbnail = thumbnail.path
      .replace(/\\/g, '/')
      .split('uploads')[1];
  }

  // 📅 Publish Logic
  if (payload.status === 'publish') {
    payload.publishDateTime = new Date();
  } else {
    payload.publishDateTime = null;
  }

  const result = await VideoService.createVideoToDB(payload, user._id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Video created successfully',
    data: result,
  });
});

// GET ALL
const getAllVideos = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const { result, meta } = await VideoService.getAllVideosFromDB(
    user.role,
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Videos retrieved successfully',
    data: result,
    pagination: meta,
  });
});

// SINGLE
const getSingleVideo = catchAsync(async (req: Request, res: Response) => {
  const result = await VideoService.getSingleVideoFromDB(req.params.id as string);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Video retrieved successfully',
    data: result,
  });
});

// UPDATE
const updateVideo = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const files = req.files as {
    video?: Express.Multer.File[];
    image?: Express.Multer.File[];
  };


  const video = files?.video?.[0];
  const thumbnail = files?.image?.[0];

  const data = req.body?.data ? JSON.parse(req.body.data) : {}

  const payload: any = { ...data };

  // 🎥 Video Upload
  if (video) {
    payload.videoUrl = video.path.replace(/\\/g, "/").split("uploads")[1];
  }

  // 🖼️ Thumbnail Upload
  if (thumbnail) {
    payload.thumbnail = thumbnail.path
      .replace(/\\/g, "/")
      .split("uploads")[1];
  }



  // 📅 Publish Logic
  if (payload.status === "publish") {
    payload.publishDateTime = new Date();
  } else if (payload.status === "draft") {
    payload.publishDateTime = null;
  }


  const result = await VideoService.updateVideoToDB(
    req.params.id as string,
    user._id,
    payload
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Video updated successfully",
    data: result,
  });
});

// DELETE
const deleteVideo = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await VideoService.deleteVideoFromDB(
    req.params.id as string,
    user._id as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Video deleted successfully',
    data: result,
  });
});

// TOGGLE
const toggleVideoStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await VideoService.toggleVideoStatusToDB(
    req.params.id as string,
    user
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Video status toggled successfully',
    data: result,
  });
});


const getPublicVideos = catchAsync(async (req: Request, res: Response) => {
  const { result, meta } = await VideoService.getPublicVideosFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Public videos retrieved successfully',
    data: result,
    pagination: meta,
  });
});

export const VideoController = {
  createVideo,
  getAllVideos,
  getSingleVideo,
  updateVideo,
  deleteVideo,
  toggleVideoStatus,
  getPublicVideos
};