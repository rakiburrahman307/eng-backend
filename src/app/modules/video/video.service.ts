import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { IVideo } from './video.interface';
import { Video } from './video.model';
import QueryBuilder from "../../../util/queryBuilder";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, AWS_S3_BUCKET } from "../../../config/aws";

// CREATE
const createVideoToDB = async (payload: IVideo, userId: string) => {
  return await Video.create({
    ...payload,
    createdBy: userId,
  });
};

// GET ALL
const getAllVideosFromDB = async (
  role: string,
  query: Record<string, any>
) => {
  const now = new Date();

  let baseQuery = {};

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    baseQuery = {
      $or: [
        { status: 'publish' },
        { status: 'schedule', publishDateTime: { $lte: now } },
      ],
    };
  }

  const videoQuery = new QueryBuilder(Video.find(baseQuery), query)
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await videoQuery.modelQuery;
  const meta = await videoQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};
// SINGLE
const getSingleVideoFromDB = async (id: string) => {
  const video = await Video.findById(id);

  if (!video) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video not found');
  }

  return video;
};

// UPDATE
const updateVideoToDB = async (
  id: string,
  userId: string,
  payload: Partial<IVideo>
) => {

  const video = await Video.findById(id);



  if (!video) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Video not found");
  }

  if (video.createdBy?.toString() !== userId.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not allowed");
  }

  const updatedVideo = await Video.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return updatedVideo;
};

// DELETE
const deleteVideoFromDB = async (id: string, userId: string) => {
  const video = await Video.findById(id);

  if (!video) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video not found');
  }

  if (video.createdBy?.toString() !== userId.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not allowed');
  }

  return await Video.findByIdAndDelete(id);
};

// TOGGLE
const toggleVideoStatusToDB = async (id: string, user: any) => {
  const video = await Video.findById(id);

  if (!video) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Video not found');
  }

  if (
    user.role !== 'ADMIN' &&
    user.role !== 'SUPER_ADMIN' &&
    video.createdBy?.toString() !== user._id.toString()
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not allowed');
  }

  video.status = video.status === 'publish' ? 'draft' : 'publish';

  return await video.save();
};


const getPublicVideosFromDB = async (query: Record<string, any>) => {
  const now = new Date();

  const baseQuery = {
    $or: [
      { status: 'publish' },
      { status: 'schedule', publishDateTime: { $lte: now } },
    ],
  };

  const videoQuery = new QueryBuilder(Video.find(baseQuery), query)
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await videoQuery.modelQuery;
  const meta = await videoQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

// GENERATE PRE-SIGNED URL FOR S3 UPLOAD
const generatePresignedUrl = async (fileName: string, contentType: string) => {
  const key = `videos/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // 10 minutes

  const videoUrl = `https://${AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, videoUrl, key };
};

export const VideoService = {
  createVideoToDB,
  getAllVideosFromDB,
  getSingleVideoFromDB,
  updateVideoToDB,
  deleteVideoFromDB,
  toggleVideoStatusToDB,
  getPublicVideosFromDB,
  generatePresignedUrl,
};