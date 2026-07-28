import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { VenueCategoryService } from './venueCategory.service';

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await VenueCategoryService.createCategoryToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Venue category created successfully',
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await VenueCategoryService.getAllCategoriesFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Venue categories retrieved successfully',
    data: result,
  });
});

const getAllCategoriesForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await VenueCategoryService.getAllCategoriesForAdminFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All Venue categories retrieved for admin',
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await VenueCategoryService.getSingleCategoryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Venue category retrieved successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await VenueCategoryService.updateCategoryToDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Venue category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await VenueCategoryService.deleteCategoryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Venue category deleted successfully',
    data: result,
  });
});

export const VenueCategoryController = {
  createCategory,
  getAllCategories,
  getAllCategoriesForAdmin,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
