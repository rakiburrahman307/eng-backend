import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { IAgeGroupCategory } from './ageGroupCategory.interface';
import { AgeGroupCategory } from './ageGroupCategory.model';
import { Types } from 'mongoose';

// ========================== CREATE ==========================
const createCategoryToDB = async (payload: Partial<IAgeGroupCategory>): Promise<IAgeGroupCategory> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category name is required');
  }

  // If this is a subcategory, validate parentCategory
  if (payload.parentCategory) {
    const parentExists = await AgeGroupCategory.findById(payload.parentCategory);
    if (!parentExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Parent category not found');
    }
  }

  const existing = await AgeGroupCategory.findOne({
    name: { $regex: new RegExp(`^${payload.name.trim()}$`, 'i') },
    parentCategory: payload.parentCategory || null,
  });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Age Group category already exists with this name under this parent category');
  }

  if (payload.order !== undefined && payload.order !== null) {
    const orderExist = await AgeGroupCategory.findOne({
      order: payload.order,
      parentCategory: payload.parentCategory || null,
    });
    if (orderExist) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Category order must be unique. Order ${payload.order} is already in use.`
      );
    }
  }

  const result = await AgeGroupCategory.create(payload);
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
const getAllCategoriesFromDB = async (): Promise<IAgeGroupCategory[]> => {
  // Return only top-level categories with their subcategories populated
  const result = await AgeGroupCategory.find({
    status: 'active',
    parentCategory: null,
  })
    .sort({ order: 1, name: 1 })
    .populate({
      path: 'subCategories',
      match: { status: 'active' },
      options: { sort: { order: 1, name: 1 } },
    });
  return sortCategoriesNaturally(result);
};

// ========================== GET ALL (Admin) ==========================
const getAllCategoriesForAdminFromDB = async (): Promise<IAgeGroupCategory[]> => {
  const result = await AgeGroupCategory.find({ parentCategory: null })
    .sort({ order: 1, name: 1 })
    .populate({
      path: 'subCategories',
      options: { sort: { order: 1, name: 1 } },
    });
  return sortCategoriesNaturally(result);
};

// ========================== GET SINGLE ==========================
const getSingleCategoryFromDB = async (id: string): Promise<IAgeGroupCategory | null> => {
  const result = await AgeGroupCategory.findById(id).populate({
    path: 'subCategories',
    options: { sort: { order: 1, name: 1 } },
  });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }
  const [sorted] = sortCategoriesNaturally([result]);
  return sorted;
};

// ========================== UPDATE ==========================
const updateCategoryToDB = async (
  id: string,
  payload: Partial<IAgeGroupCategory>
): Promise<IAgeGroupCategory | null> => {
  const isExist = await AgeGroupCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  if (payload.order !== undefined && payload.order !== null) {
    const orderExist = await AgeGroupCategory.findOne({
      _id: { $ne: id },
      order: payload.order,
      parentCategory: isExist.parentCategory || null,
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

  const result = await AgeGroupCategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate({
    path: 'subCategories',
    options: { sort: { order: 1, name: 1 } },
  });

  return result;
};

// ========================== DELETE ==========================
const deleteCategoryFromDB = async (id: string): Promise<IAgeGroupCategory | null> => {
  const isExist = await AgeGroupCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  // Also delete all subcategories under this category
  await AgeGroupCategory.deleteMany({ parentCategory: new Types.ObjectId(id) });

  const result = await AgeGroupCategory.findByIdAndDelete(id);
  return result;
};

// ========================== GET SUBCATEGORIES ==========================
const getSubCategoriesFromDB = async (parentId: string): Promise<IAgeGroupCategory[]> => {
  const parentExists = await AgeGroupCategory.findById(parentId);
  if (!parentExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Parent category not found');
  }

  const result = await AgeGroupCategory.find({
    parentCategory: new Types.ObjectId(parentId),
    status: 'active',
  }).sort({ order: 1, name: 1 });
  return result;
};

export const AgeGroupCategoryService = {
  createCategoryToDB,
  getAllCategoriesFromDB,
  getAllCategoriesForAdminFromDB,
  getSingleCategoryFromDB,
  updateCategoryToDB,
  deleteCategoryFromDB,
  getSubCategoriesFromDB,
};
