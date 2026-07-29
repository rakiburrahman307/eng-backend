import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { INewsCategory } from './newsCategory.interface';
import { NewsCategory } from './newsCategory.model';

const createCategoryToDB = async (payload: Partial<INewsCategory>): Promise<INewsCategory> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category name is required');
  }

  const existing = await NewsCategory.findOne({ name: payload.name.trim() });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'News category already exists with this name');
  }

  const result = await NewsCategory.create(payload);
  return result;
};

const getAllCategoriesFromDB = async (): Promise<INewsCategory[]> => {
  const result = await NewsCategory.find({ status: 'active' }).sort({ order: 1, name: 1 });
  return result;
};

const getAllCategoriesForAdminFromDB = async (): Promise<INewsCategory[]> => {
  const result = await NewsCategory.find().sort({ order: 1, name: 1 });
  return result;
};

const getSingleCategoryFromDB = async (id: string): Promise<INewsCategory | null> => {
  const result = await NewsCategory.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }
  return result;
};

const updateCategoryToDB = async (
  id: string,
  payload: Partial<INewsCategory>
): Promise<INewsCategory | null> => {
  const isExist = await NewsCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  if (payload.name) {
    payload.slug = payload.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  }

  const result = await NewsCategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteCategoryFromDB = async (id: string): Promise<INewsCategory | null> => {
  const isExist = await NewsCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  const result = await NewsCategory.findByIdAndDelete(id);
  return result;
};

export const NewsCategoryService = {
  createCategoryToDB,
  getAllCategoriesFromDB,
  getAllCategoriesForAdminFromDB,
  getSingleCategoryFromDB,
  updateCategoryToDB,
  deleteCategoryFromDB,
};
