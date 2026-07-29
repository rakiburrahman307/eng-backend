import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import QueryBuilder from '../../../util/queryBuilder';
import { IGallery } from './gallery.interface';
import { Gallery } from './gallery.model';

const createGalleryToDB = async (payload: Partial<IGallery>): Promise<IGallery> => {
  if (!payload.image) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Gallery image is required');
  }

  const result = await Gallery.create(payload);
  return (await result.populate('category')).populate('subCategory');
};

import { Types } from 'mongoose';
import { GalleryCategory } from '../galleryCategory/galleryCategory.model';

const resolveGalleryCategoryQuery = async (query: Record<string, any>) => {
  const categoryValue = query.categoryName || query.category || query.categoryname;
  if (categoryValue) {
    if (Types.ObjectId.isValid(categoryValue)) {
      query.category = new Types.ObjectId(categoryValue);
    } else {
      const categoryDoc = await GalleryCategory.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${categoryValue.trim()}$`, 'i') } },
          { slug: categoryValue.trim().toLowerCase() },
          { name: { $regex: categoryValue.trim(), $options: 'i' } },
        ],
      });
      query.category = categoryDoc ? categoryDoc._id : new Types.ObjectId();
    }
    delete query.categoryName;
    delete query.categoryname;
  }

  const subCategoryValue =
    query.subCategoryName ||
    query.subCategory ||
    query.subcategory ||
    query.subcategoryName;
  if (subCategoryValue) {
    if (Types.ObjectId.isValid(subCategoryValue)) {
      query.subCategory = new Types.ObjectId(subCategoryValue);
    } else {
      const subCategoryDoc = await GalleryCategory.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${subCategoryValue.trim()}$`, 'i') } },
          { slug: subCategoryValue.trim().toLowerCase() },
          { name: { $regex: subCategoryValue.trim(), $options: 'i' } },
        ],
      });
      query.subCategory = subCategoryDoc ? subCategoryDoc._id : new Types.ObjectId();
    }
    delete query.subCategoryName;
    delete query.subcategory;
    delete query.subcategoryName;
  }
};

const getAllGalleriesFromDB = async (query: Record<string, any>) => {
  await resolveGalleryCategoryQuery(query);

  const galleryQuery = new QueryBuilder(Gallery.find(), query)
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await galleryQuery.modelQuery
    .populate('category')
    .populate('subCategory');
  const meta = await galleryQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

const getSingleGalleryFromDB = async (id: string): Promise<IGallery | null> => {
  const result = await Gallery.findById(id)
    .populate('category')
    .populate('subCategory');
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Gallery item not found');
  }
  return result;
};

const updateGalleryInDB = async (
  id: string,
  payload: Partial<IGallery>
): Promise<IGallery | null> => {
  const isExist = await Gallery.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Gallery item not found');
  }

  const result = await Gallery.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate('category')
    .populate('subCategory');

  return result;
};

const deleteGalleryFromDB = async (id: string): Promise<IGallery | null> => {
  const isExist = await Gallery.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Gallery item not found');
  }

  const result = await Gallery.findByIdAndDelete(id);
  return result;
};

export const GalleryService = {
  createGalleryToDB,
  getAllGalleriesFromDB,
  getSingleGalleryFromDB,
  updateGalleryInDB,
  deleteGalleryFromDB,
};
