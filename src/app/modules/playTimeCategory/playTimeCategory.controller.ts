import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PlayTimeCategoryService } from './playTimeCategory.service';

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await PlayTimeCategoryService.createCategoryToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Playtime category created successfully',
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await PlayTimeCategoryService.getAllCategoriesFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Playtime categories retrieved successfully',
    data: result,
  });
});

const getAllCategoriesForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await PlayTimeCategoryService.getAllCategoriesForAdminFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All Playtime categories retrieved for admin',
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await PlayTimeCategoryService.getSingleCategoryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Playtime category retrieved successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await PlayTimeCategoryService.updateCategoryToDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Playtime category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await PlayTimeCategoryService.deleteCategoryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Playtime category deleted successfully',
    data: result,
  });
});

export const PlayTimeCategoryController = {
  createCategory,
  getAllCategories,
  getAllCategoriesForAdmin,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
