import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AgeGroupCategoryService } from './ageGroupCategory.service';

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await AgeGroupCategoryService.createCategoryToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Age Group category created successfully',
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await AgeGroupCategoryService.getAllCategoriesFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Age Group categories retrieved successfully',
    data: result,
  });
});

const getAllCategoriesForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AgeGroupCategoryService.getAllCategoriesForAdminFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All Age Group categories retrieved for admin',
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await AgeGroupCategoryService.getSingleCategoryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Age Group category retrieved successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await AgeGroupCategoryService.updateCategoryToDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Age Group category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await AgeGroupCategoryService.deleteCategoryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Age Group category deleted successfully',
    data: result,
  });
});

const getSubCategories = catchAsync(async (req: Request, res: Response) => {
  const parentId = Array.isArray(req.params.parentId) ? req.params.parentId[0] : req.params.parentId;
  const result = await AgeGroupCategoryService.getSubCategoriesFromDB(parentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Age Group sub-categories retrieved successfully',
    data: result,
  });
});

export const AgeGroupCategoryController = {
  createCategory,
  getAllCategories,
  getAllCategoriesForAdmin,
  getSingleCategory,
  updateCategory,
  deleteCategory,
  getSubCategories,
};
