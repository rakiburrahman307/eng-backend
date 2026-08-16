import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiErrors';
import { INews } from './news.interface';
import { News } from './news.model';
import QueryBuilder from "../../../util/queryBuilder";

// CREATE NEWS
const createNewsToDB = async (payload: INews, userId: string) => {
  const result = await News.create({
    ...payload,
    createdBy: userId, // 🔥 THIS WAS MISSING OR NOT SAVING
  });

  return result;
};

// GET ALL NEWS (ROLE BASED)
const getAllNewsFromDB = async (
  role: string,
  query: Record<string, any>
) => {
  const now = new Date();

  let baseQuery = {};

  // ADMIN can see all
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    baseQuery = {};
  } else {
    // Public users
    baseQuery = {
      $or: [
        { status: 'publish' },
        {
          status: 'schedule',
          publishDateTime: { $lte: now },
        },
      ],
    };
  }

  const queryParams = { ...query };
  queryParams.sort = queryParams.sort || 'order -createdAt';

  const newsQuery = new QueryBuilder(
    News.find(baseQuery),
    queryParams
  )
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await newsQuery.modelQuery;
  const meta = await newsQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};


// GET PUBLIC NEWS (NO TOKEN BASED)
const getPublicNewsFromDB = async (
  query: Record<string, any>
) => {
  const queryParams = { ...query };
  queryParams.sort = queryParams.sort || 'order -createdAt';

  const newsQuery = new QueryBuilder(
    News.find({ status: 'publish' }),
    queryParams
  )
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await newsQuery.modelQuery;
  const meta = await newsQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

// GET SINGLE (NO PARAM ID VERSION -> optional, token based user flow if needed)
const getMyNewsFromDB = async (userId: string) => {
  return await News.find({ createdBy: userId }).sort({ order: 1, createdAt: -1 });
};


// GET SINGLE (NO PARAM ID VERSION -> optional, token based user flow if needed)
const getSingleNewsFromDB = async (newsId: string) => {
    const news = await News.findById(newsId);

    if (!news) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'News not found');
    }
    return news;
};
// UPDATE (ONLY OWNER VIA TOKEN)
const updateNewsToDB = async (
  newsId: string,
  userId: string,
  payload: Partial<INews>
) => {
  const news = await News.findById(newsId);

  if (!news) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'News not found');
  }

  const createdBy = news.createdBy ? news.createdBy.toString() : null;

  if (!createdBy || createdBy !== userId.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not allowed');
  }

  const result = await News.findByIdAndUpdate(newsId, payload, {
    new: true,
  });

  return result;
};

// DELETE (ONLY OWNER VIA TOKEN)
const deleteNewsFromDB = async (newsId: string, userId: string) => {
  const news = await News.findById(newsId);

  if (!news) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'News not found');
  }

  if (!news.createdBy || news.createdBy.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not allowed');
  }

  return await News.findByIdAndDelete(newsId);
};

// TOGGLE STATUS (ONLY OWNER OR ADMIN)
const toggleNewsStatusToDB = async (newsId: string, user: any) => {
  const news = await News.findById(newsId);

  if (!news) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'News not found');
  }

  if (
    user.role !== 'ADMIN' &&
    user.role !== 'SUPER_ADMIN' &&
    (news as any).createdBy?.toString() !== user._id.toString()
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not allowed');
  }

  news.status = news.status === 'publish' ? 'draft' : 'publish';

  return await news.save();
};

// REARRANGE NEWS ORDER
const rearrangeNewsInDB = async (
  payload: { id: string; order: number }[]
) => {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid payload: news array is required');
  }

  const invalidIds = payload.filter((item) => !Types.ObjectId.isValid(item.id));
  if (invalidIds.length > 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid news IDs: ${invalidIds.map((i) => i.id).join(', ')}`);
  }

  const bulkOps = payload.map((item) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(item.id) },
      update: { $set: { order: item.order } },
    },
  }));

  const result = await News.bulkWrite(bulkOps);
  return { modifiedCount: result.modifiedCount };
};

export const NewsService = {
  createNewsToDB,
  getAllNewsFromDB,
  getMyNewsFromDB,
  getSingleNewsFromDB,
  updateNewsToDB,
  deleteNewsFromDB,
  toggleNewsStatusToDB,
  getPublicNewsFromDB,
  rearrangeNewsInDB,
};