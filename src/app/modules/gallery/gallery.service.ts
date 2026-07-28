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

const getAllGalleriesFromDB = async (query: Record<string, any>) => {
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
