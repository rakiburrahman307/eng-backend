import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { IAgeGroupCategory } from './ageGroupCategory.interface';
import { AgeGroupCategory } from './ageGroupCategory.model';

const createCategoryToDB = async (payload: Partial<IAgeGroupCategory>): Promise<IAgeGroupCategory> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category name is required');
  }

  const existing = await AgeGroupCategory.findOne({ name: payload.name.trim() });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Age Group category already exists with this name');
  }

  const result = await AgeGroupCategory.create(payload);
  return result;
};

const getAllCategoriesFromDB = async (): Promise<IAgeGroupCategory[]> => {
  const result = await AgeGroupCategory.find({ status: 'active' }).sort({ order: 1, name: 1 });
  return result;
};

const getAllCategoriesForAdminFromDB = async (): Promise<IAgeGroupCategory[]> => {
  const result = await AgeGroupCategory.find().sort({ order: 1, name: 1 });
  return result;
};

const getSingleCategoryFromDB = async (id: string): Promise<IAgeGroupCategory | null> => {
  const result = await AgeGroupCategory.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }
  return result;
};

const updateCategoryToDB = async (
  id: string,
  payload: Partial<IAgeGroupCategory>
): Promise<IAgeGroupCategory | null> => {
  const isExist = await AgeGroupCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  if (payload.name) {
    payload.slug = payload.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  }

  const result = await AgeGroupCategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteCategoryFromDB = async (id: string): Promise<IAgeGroupCategory | null> => {
  const isExist = await AgeGroupCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  const result = await AgeGroupCategory.findByIdAndDelete(id);
  return result;
};

export const AgeGroupCategoryService = {
  createCategoryToDB,
  getAllCategoriesFromDB,
  getAllCategoriesForAdminFromDB,
  getSingleCategoryFromDB,
  updateCategoryToDB,
  deleteCategoryFromDB,
};
