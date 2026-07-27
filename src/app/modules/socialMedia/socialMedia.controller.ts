import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SocialMediaService } from './socialMedia.service';

const createSocialMedia = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialMediaService.createSocialMediaToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Social media link added successfully',
    data: result,
  });
});

const getAllSocialMedia = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialMediaService.getAllSocialMediaFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Social media links retrieved successfully',
    data: result,
  });
});

const getAllSocialMediaForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialMediaService.getAllSocialMediaForAdminFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All social media links retrieved for admin',
    data: result,
  });
});

const updateSocialMedia = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await SocialMediaService.updateSocialMediaInDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Social media link updated successfully',
    data: result,
  });
});

const deleteSocialMedia = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await SocialMediaService.deleteSocialMediaFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Social media link deleted successfully',
    data: result,
  });
});

export const SocialMediaController = {
  createSocialMedia,
  getAllSocialMedia,
  getAllSocialMediaForAdmin,
  updateSocialMedia,
  deleteSocialMedia,
};
