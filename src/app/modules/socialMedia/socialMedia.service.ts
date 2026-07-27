import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { ISocialMedia } from './socialMedia.interface';
import { SocialMedia } from './socialMedia.model';

const createSocialMediaToDB = async (payload: Partial<ISocialMedia>): Promise<ISocialMedia> => {
  if (!payload.platform || !payload.url) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Platform and URL are required');
  }

  const result = await SocialMedia.create(payload);
  return result;
};

const getAllSocialMediaFromDB = async (): Promise<ISocialMedia[]> => {
  const result = await SocialMedia.find({ status: true }).sort({ order: 1, createdAt: -1 });
  return result;
};

const getAllSocialMediaForAdminFromDB = async (): Promise<ISocialMedia[]> => {
  const result = await SocialMedia.find().sort({ order: 1, createdAt: -1 });
  return result;
};

const updateSocialMediaInDB = async (
  id: string,
  payload: Partial<ISocialMedia>
): Promise<ISocialMedia | null> => {
  const isExist = await SocialMedia.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Social media link not found');
  }

  const result = await SocialMedia.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteSocialMediaFromDB = async (id: string): Promise<ISocialMedia | null> => {
  const isExist = await SocialMedia.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Social media link not found');
  }

  const result = await SocialMedia.findByIdAndDelete(id);
  return result;
};

export const SocialMediaService = {
  createSocialMediaToDB,
  getAllSocialMediaFromDB,
  getAllSocialMediaForAdminFromDB,
  updateSocialMediaInDB,
  deleteSocialMediaFromDB,
};
