import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { IPlayTimeCategory } from './playTimeCategory.interface';
import { PlayTimeCategory } from './playTimeCategory.model';

const createCategoryToDB = async (payload: Partial<IPlayTimeCategory>): Promise<IPlayTimeCategory> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category name is required');
  }

  const existing = await PlayTimeCategory.findOne({ name: payload.name.trim() });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Playtime category already exists with this name');
  }

  if (payload.order !== undefined && payload.order !== null) {
    const orderExist = await PlayTimeCategory.findOne({ order: payload.order });
    if (orderExist) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Category order must be unique. Order ${payload.order} is already in use.`
      );
    }
  }

  const result = await PlayTimeCategory.create(payload);
  return result;
};

const sortCategoriesNaturally = (categories: any[]) => {
  return categories
    .map((cat: any) => (typeof cat.toObject === 'function' ? cat.toObject() : cat))
    .sort((a: any, b: any) => {
      if ((a.order ?? 0) !== (b.order ?? 0)) {
        return (a.order ?? 0) - (b.order ?? 0);
      }
      return (a.name || '').localeCompare(b.name || '', undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
};

const getAllCategoriesFromDB = async (): Promise<IPlayTimeCategory[]> => {
  const result = await PlayTimeCategory.find({ status: 'active' }).sort({ order: 1, name: 1 });
  return sortCategoriesNaturally(result);
};

const getAllCategoriesForAdminFromDB = async (): Promise<IPlayTimeCategory[]> => {
  const result = await PlayTimeCategory.find().sort({ order: 1, name: 1 });
  return sortCategoriesNaturally(result);
};

const getSingleCategoryFromDB = async (id: string): Promise<IPlayTimeCategory | null> => {
  const result = await PlayTimeCategory.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }
  return result;
};

const updateCategoryToDB = async (
  id: string,
  payload: Partial<IPlayTimeCategory>
): Promise<IPlayTimeCategory | null> => {
  const isExist = await PlayTimeCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  if (payload.order !== undefined && payload.order !== null) {
    const orderExist = await PlayTimeCategory.findOne({
      _id: { $ne: id },
      order: payload.order,
    });
    if (orderExist) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Category order must be unique. Order ${payload.order} is already in use.`
      );
    }
  }

  if (payload.name) {
    payload.slug = payload.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  }

  const result = await PlayTimeCategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteCategoryFromDB = async (id: string): Promise<IPlayTimeCategory | null> => {
  const isExist = await PlayTimeCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  const result = await PlayTimeCategory.findByIdAndDelete(id);
  return result;
};

export const PlayTimeCategoryService = {
  createCategoryToDB,
  getAllCategoriesFromDB,
  getAllCategoriesForAdminFromDB,
  getSingleCategoryFromDB,
  updateCategoryToDB,
  deleteCategoryFromDB,
};
