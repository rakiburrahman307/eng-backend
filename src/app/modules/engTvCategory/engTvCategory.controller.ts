import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { EngTvCategoryService } from './engTvCategory.service';

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await EngTvCategoryService.createCategoryToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'ENG TV category created successfully',
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await EngTvCategoryService.getAllCategoriesFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'ENG TV categories retrieved successfully',
    data: result,
  });
});

const getAllCategoriesForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await EngTvCategoryService.getAllCategoriesForAdminFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All ENG TV categories retrieved for admin',
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await EngTvCategoryService.getSingleCategoryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'ENG TV category retrieved successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await EngTvCategoryService.updateCategoryToDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'ENG TV category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await EngTvCategoryService.deleteCategoryFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'ENG TV category deleted successfully',
    data: result,
  });
});

const rearrangeCategories = catchAsync(async (req: Request, res: Response) => {
  const { categories } = req.body as { categories: { id: string; order: number }[] };
  const result = await EngTvCategoryService.rearrangeCategoriesInDB(categories);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'ENG TV categories reordered successfully',
    data: result,
  });
});

export const EngTvCategoryController = {
  createCategory,
  getAllCategories,
  getAllCategoriesForAdmin,
  getSingleCategory,
  updateCategory,
  deleteCategory,
  rearrangeCategories,
};
