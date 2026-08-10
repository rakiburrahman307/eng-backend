import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { IGalleryCategory } from './galleryCategory.interface';
import { GalleryCategory } from './galleryCategory.model';

const createCategoryToDB = async (payload: Partial<IGalleryCategory>): Promise<IGalleryCategory> => {
  if (!payload.name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Category name is required');
  }

  const parentCategoryId = payload.parentCategory || null;

  if (parentCategoryId) {
    const parentExists = await GalleryCategory.findById(parentCategoryId);
    if (!parentExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Parent category not found');
    }
  }

  const existing = await GalleryCategory.findOne({
    name: { $regex: new RegExp(`^${payload.name.trim()}$`, 'i') },
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
    const orderExist = await GalleryCategory.findOne({
      order: payload.order,
      parentCategory: parentCategoryId,
    });
    if (orderExist) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Category order must be unique under this parent category. Order ${payload.order} is already in use.`
      );
    }
  }

  const result = await GalleryCategory.create({
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

const getAllCategoriesFromDB = async (): Promise<IGalleryCategory[]> => {
  const result = await GalleryCategory.find({
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

  return sortCategoriesNaturally(result);
};

const getAllCategoriesForAdminFromDB = async (): Promise<IGalleryCategory[]> => {
  const result = await GalleryCategory.find({
    $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
  })
    .sort({ order: 1, name: 1 })
    .populate({
      path: 'subCategories',
      select: 'name',
      options: { sort: { order: 1, name: 1 } },
    });

  return sortCategoriesNaturally(result);
};

const getSingleCategoryFromDB = async (id: string): Promise<IGalleryCategory | null> => {
  const result = await GalleryCategory.findById(id)
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
  payload: Partial<IGalleryCategory>
): Promise<IGalleryCategory | null> => {
  const isExist = await GalleryCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  if (payload.parentCategory) {
    if (payload.parentCategory.toString() === id) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'A category cannot be its own parent');
    }
    const parentExists = await GalleryCategory.findById(payload.parentCategory);
    if (!parentExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Parent category not found');
    }
  }

  if (payload.order !== undefined && payload.order !== null) {
    const orderExist = await GalleryCategory.findOne({
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

  const result = await GalleryCategory.findByIdAndUpdate(id, payload, {
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

const deleteCategoryFromDB = async (id: string): Promise<IGalleryCategory | null> => {
  const isExist = await GalleryCategory.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  // Delete all subcategories under this parent category
  await GalleryCategory.deleteMany({ parentCategory: id });

  const result = await GalleryCategory.findByIdAndDelete(id);
  return result;
};

export const GalleryCategoryService = {
  createCategoryToDB,
  getAllCategoriesFromDB,
  getAllCategoriesForAdminFromDB,
  getSingleCategoryFromDB,
  updateCategoryToDB,
  deleteCategoryFromDB,
};
