import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { GalleryCategoryService } from './galleryCategory.service';

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await GalleryCategoryService.createCategoryToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Gallery category created successfully',
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await GalleryCategoryService.getAllCategoriesFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Gallery categories retrieved successfully',
    data: result,
  });
});

const getAllCategoriesForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await GalleryCategoryService.getAllCategoriesForAdminFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All Gallery categories retrieved for admin',
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await GalleryCategoryService.getSingleCategoryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Gallery category retrieved successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await GalleryCategoryService.updateCategoryToDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Gallery category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await GalleryCategoryService.deleteCategoryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Gallery category deleted successfully',
    data: result,
  });
});

export const GalleryCategoryController = {
  createCategory,
  getAllCategories,
  getAllCategoriesForAdmin,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
