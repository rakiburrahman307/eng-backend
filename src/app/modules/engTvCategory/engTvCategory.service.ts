import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { IEngTvCategory } from './engTvCategory.interface';
import { EngTvCategory } from './engTvCategory.model';
import { Types } from 'mongoose';

// ========================== CREATE ==========================
const createCategoryToDB = async (payload: Partial<IEngTvCategory>): Promise<IEngTvCategory> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category name is required');
  }

  const parentCategoryId = payload.parentCategory || null;

  if (parentCategoryId) {
    const parentExists = await EngTvCategory.findById(parentCategoryId);
    if (!parentExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Parent category not found');
    }
  }

  const existing = await EngTvCategory.findOne({
    name: payload.name.trim(),
    parentCategory: parentCategoryId,
  });

  if (existing) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      parentCategoryId
        ? 'Sub-category already exists with this name under the selected category'
        : 'Category already exists with this name'
    );
  }

  // Auto-assign order if not provided: place at end
  if (payload.order === undefined || payload.order === null) {
    const lastCat = await EngTvCategory.findOne({ parentCategory: parentCategoryId })
      .sort({ order: -1 })
      .select('order');
    payload.order = lastCat ? (lastCat.order ?? 0) + 1 : 1;
  }

  const result = await EngTvCategory.create({
    ...payload,
    parentCategory: parentCategoryId,
  });
  return result;
};

const sortCategoriesNaturally = (categories: any[]) => {
  return categories
    .map((cat: any) => {
      const plainCat = typeof cat.toObject === 'function' ? cat.toObject() : cat;
      if (Array.isArray(plainCat.subCategories)) {
        plainCat.subCategories.sort((a: any, b: any) => {
          if ((a.order ?? 0) !== (b.order ?? 0)) {
            return (a.order ?? 0) - (b.order ?? 0);
          }
          return (a.name || '').localeCompare(b.name || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        });
      }
      return plainCat;
    })
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

// ========================== GET ALL (Public) ==========================
const getAllCategoriesFromDB = async (): Promise<IEngTvCategory[]> => {
  const result = await EngTvCategory.find({
    status: 'active',
    $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
  })
    .sort({ order: 1, name: 1 })
    .populate({
      path: 'subCategories',
      match: { status: 'active' },
      select: 'name isLandscape',
      options: { sort: { order: 1, name: 1 } },
    });

  return sortCategoriesNaturally(result);
};

// ========================== GET ALL (Admin) ==========================
const getAllCategoriesForAdminFromDB = async (): Promise<IEngTvCategory[]> => {
  const result = await EngTvCategory.find({
    $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
  })
    .sort({ order: 1, name: 1 })
    .populate({
      path: 'subCategories',
      select: 'name isLandscape',
      options: { sort: { order: 1, name: 1 } },
    });

  return sortCategoriesNaturally(result);
};

// ========================== GET SINGLE ==========================
const getSingleCategoryFromDB = async (id: string): Promise<IEngTvCategory | null> => {
  const result = await EngTvCategory.findById(id)
    .populate('parentCategory')
    .populate({
      path: 'subCategories',
      select: 'name isLandscape',
    });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }
  return result;
};

// ========================== UPDATE ==========================
const updateCategoryToDB = async (
  id: string,
  payload: Partial<IEngTvCategory>
): Promise<IEngTvCategory | null> => {
  const isExist = await EngTvCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  if (payload.parentCategory) {
    if (payload.parentCategory.toString() === id) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'A category cannot be its own parent');
    }
    const parentExists = await EngTvCategory.findById(payload.parentCategory);
    if (!parentExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Parent category not found');
    }
  }

  if (payload.name) {
    payload.slug = payload.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  }

  const result = await EngTvCategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate('parentCategory')
    .populate({
      path: 'subCategories',
      select: 'name isLandscape',
    });

  return result;
};

// ========================== DELETE ==========================
const deleteCategoryFromDB = async (id: string): Promise<IEngTvCategory | null> => {
  const isExist = await EngTvCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  // Delete all subcategories under this parent category
  await EngTvCategory.deleteMany({ parentCategory: id });

  const result = await EngTvCategory.findByIdAndDelete(id);
  return result;
};

// ========================== REARRANGE ==========================
const rearrangeCategoriesInDB = async (
  payload: { id: string; order: number }[]
): Promise<{ modifiedCount: number }> => {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid payload: categories array is required');
  }

  // Validate all IDs
  const invalidIds = payload.filter((item) => !Types.ObjectId.isValid(item.id));
  if (invalidIds.length > 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid category IDs: ${invalidIds.map((i) => i.id).join(', ')}`);
  }

  const bulkOps = payload.map((item) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(item.id) },
      update: { $set: { order: item.order } },
    },
  }));

  const result = await EngTvCategory.bulkWrite(bulkOps);
  return { modifiedCount: result.modifiedCount };
};

export const EngTvCategoryService = {
  createCategoryToDB,
  getAllCategoriesFromDB,
  getAllCategoriesForAdminFromDB,
  getSingleCategoryFromDB,
  updateCategoryToDB,
  deleteCategoryFromDB,
  rearrangeCategoriesInDB,
};
