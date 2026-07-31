import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { IEngTvCategory } from './engTvCategory.interface';
import { EngTvCategory } from './engTvCategory.model';

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

  if (payload.order !== undefined && payload.order !== null) {
    const orderExist = await EngTvCategory.findOne({ order: payload.order });
    if (orderExist) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Category order must be unique. Order ${payload.order} is already in use.`
      );
    }
  }

  const result = await EngTvCategory.create({
    ...payload,
    parentCategory: parentCategoryId,
  });
  return result;
};

const getAllCategoriesFromDB = async (): Promise<IEngTvCategory[]> => {
  const result = await EngTvCategory.find({
    status: 'active',
    $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
  })
    .sort({ order: 1, name: 1 })
    .populate({
      path: 'subCategories',
      match: { status: 'active' },
      select: 'name',
      options: { sort: { order: 1, name: 1 } },
    });

  return result;
};

const getAllCategoriesForAdminFromDB = async (): Promise<IEngTvCategory[]> => {
  const result = await EngTvCategory.find({
    $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
  })
    .sort({ order: 1, name: 1 })
    .populate({
      path: 'subCategories',
      select: 'name',
      options: { sort: { order: 1, name: 1 } },
    });

  return result;
};

const getSingleCategoryFromDB = async (id: string): Promise<IEngTvCategory | null> => {
  const result = await EngTvCategory.findById(id)
    .populate('parentCategory')
    .populate({
      path: 'subCategories',
      select: 'name',
    });

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

  if (payload.parentCategory) {
    if (payload.parentCategory.toString() === id) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'A category cannot be its own parent');
    }
    const parentExists = await EngTvCategory.findById(payload.parentCategory);
    if (!parentExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Parent category not found');
    }
  }

  if (payload.order !== undefined && payload.order !== null) {
    const orderExist = await EngTvCategory.findOne({
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

  const result = await EngTvCategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate('parentCategory')
    .populate({
      path: 'subCategories',
      select: 'name',
    });

  return result;
};

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

export const EngTvCategoryService = {
  createCategoryToDB,
  getAllCategoriesFromDB,
  getAllCategoriesForAdminFromDB,
  getSingleCategoryFromDB,
  updateCategoryToDB,
  deleteCategoryFromDB,
};
