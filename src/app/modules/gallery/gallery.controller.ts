import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { GalleryService } from './gallery.service';

const createGallery = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const files = req.files as { image?: Express.Multer.File[] };
  const imageFile = files?.image?.[0];

  let bodyData: any = {};
  if (req.body?.data) {
    try {
      bodyData = JSON.parse(req.body.data);
    } catch (e) {
      bodyData = req.body;
    }
  } else {
    bodyData = req.body;
  }

  let imagePath = bodyData.image || '';
  if (imageFile) {
    imagePath = `/images/${imageFile.filename}`;
  }

  const payload = {
    ...bodyData,
    image: imagePath,
    createdBy: user?._id || user?.id,
  };

  const result = await GalleryService.createGalleryToDB(payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Gallery item created successfully',
    data: result,
  });
});

const getAllGalleries = catchAsync(async (req: Request, res: Response) => {
  const result = await GalleryService.getAllGalleriesFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Gallery items retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

const getSingleGallery = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await GalleryService.getSingleGalleryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Gallery item retrieved successfully',
    data: result,
  });
});

const updateGallery = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const files = req.files as { image?: Express.Multer.File[] };
  const imageFile = files?.image?.[0];

  let bodyData: any = req.body;
  if (req.body?.data) {
    try {
      bodyData = JSON.parse(req.body.data);
    } catch (e) {}
  }

  const payload: any = { ...bodyData };
  if (imageFile) {
    payload.image = `/images/${imageFile.filename}`;
  }

  const result = await GalleryService.updateGalleryInDB(id, payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Gallery item updated successfully',
    data: result,
  });
});

const deleteGallery = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await GalleryService.deleteGalleryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Gallery item deleted successfully',
    data: result,
  });
});

export const GalleryController = {
  createGallery,
  getAllGalleries,
  getSingleGallery,
  updateGallery,
  deleteGallery,
};
