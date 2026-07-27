import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { IEngTvCategory } from './engTvCategory.interface';
import { EngTvCategory } from './engTvCategory.model';

const createCategoryToDB = async (payload: Partial<IEngTvCategory>): Promise<IEngTvCategory> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category name is required');
  }

  const existing = await EngTvCategory.findOne({ name: payload.name });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'ENG TV Category already exists with this name');
  }

  const result = await EngTvCategory.create(payload);
  return result;
};

const getAllCategoriesFromDB = async (): Promise<IEngTvCategory[]> => {
  const result = await EngTvCategory.find({ status: 'active' }).sort({ order: 1, name: 1 });
  return result;
};

const getAllCategoriesForAdminFromDB = async (): Promise<IEngTvCategory[]> => {
  const result = await EngTvCategory.find().sort({ order: 1, name: 1 });
  return result;
};

const getSingleCategoryFromDB = async (id: string): Promise<IEngTvCategory | null> => {
  const result = await EngTvCategory.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }
  return result;
};

const updateCategoryToDB = async (
  id: string,
  payload: Partial<IEngTvCategory>
): Promise<IEngTvCategory | null> => {
  const isExist = await EngTvCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  if (payload.name) {
    payload.slug = payload.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  }

  const result = await EngTvCategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteCategoryFromDB = async (id: string): Promise<IEngTvCategory | null> => {
  const isExist = await EngTvCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  const result = await EngTvCategory.findByIdAndDelete(id);
  return result;
};

export const EngTvCategoryService = {
  createCategoryToDB,
  getAllCategoriesFromDB,
  getAllCategoriesForAdminFromDB,
  getSingleCategoryFromDB,
  updateCategoryToDB,
  deleteCategoryFromDB,
};
