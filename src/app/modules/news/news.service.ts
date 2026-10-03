import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import colors from 'colors';
import ApiError from '../../../errors/ApiErrors';
import { INews } from './news.interface';
import { News } from './news.model';
import QueryBuilder from "../../../util/queryBuilder";
import { logger } from '../../../shared/logger';
import { NOTIFICATION_TYPE } from '../notification/notification.interface';
import { resolveNotificationRecipients } from '../pushNotification/pushNotification.service';
import { NotificationHelper } from '../../builder/PushNotifications';
import { notificationQueue } from '../../../helpers/bullMQ/bullQueueInstance';

// Clean HTML tags from article description for push notification preview
const cleanSnippet = (html: string, maxLength = 140): string => {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

// Broadcast notification to ALL active users when a news article is published
export const broadcastNewsPublishedNotification = async (news: any) => {
  try {
    if (!news) return;

    // Check if notification was already sent to avoid duplicate spam
    if (news.isNotificationSent) {
      return;
    }

    // Immediately mark as sent in database to prevent concurrent duplicate jobs
    await News.findByIdAndUpdate(news._id, { isNotificationSent: true });

    const title = news.title ? `${news.title}` : 'New Article Published';
    const body =
      cleanSnippet(news.description) ||
      'A new article has just been published on ENG. Tap to read now.';

    // Resolve all active account owners (parents, players, coaches, managers, referees)
    const { userIds } = await resolveNotificationRecipients(null, 'ALL');

    if (!userIds || userIds.length === 0) {
      logger.info(
        colors.yellow('[News Notification] No users found to broadcast published news.')
      );
      return;
    }

    logger.info(
      colors.cyan(
        `[News Notification] Broadcasting news "${news.title}" to ${userIds.length} users...`
      )
    );

    // Batch send in chunks of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
      const batch = userIds.slice(i, i + CHUNK_SIZE);
      await NotificationHelper.sendToBatch(batch, {
        title,
        body,
        type: NOTIFICATION_TYPE.NEWS_PUBLISHED,
        reference: news._id.toString(),
        referenceModel: 'News',
        data: {
          newsId: news._id.toString(),
          title: news.title || '',
          category:
            typeof news.category === 'object'
              ? (news.category as any)?.name || ''
              : news.category || '',
          image: news.image || '',
          screen: 'NEWS_DETAILS',
        },
      });
    }

    logger.info(
      colors.green(
        `[News Notification] Successfully dispatched news broadcast to ${userIds.length} users.`
      )
    );
  } catch (error) {
    logger.error(
      colors.red('[News Notification] Error broadcasting news notification:'),
      error
    );
  }
};

// Check and publish overdue scheduled news articles
export const checkAndPublishScheduledNews = async () => {
  try {
    const now = new Date();
    const scheduledNewsList = await News.find({
      status: 'schedule',
      publishDateTime: { $lte: now },
      isNotificationSent: { $ne: true },
    });

    for (const item of scheduledNewsList) {
      item.status = 'publish';
      await item.save();
      await broadcastNewsPublishedNotification(item);
    }
  } catch (error) {
    logger.error('checkAndPublishScheduledNews error:', error);
  }
};

// CREATE NEWS
const createNewsToDB = async (payload: INews, userId: string) => {
  const result = await News.create({
    ...payload,
    createdBy: userId,
  });

  // If published immediately, dispatch notification broadcast
  if (result.status === 'publish') {
    broadcastNewsPublishedNotification(result).catch((err) =>
      logger.error('Failed to broadcast news notification on create:', err)
    );
  } else if (result.status === 'schedule' && result.publishDateTime) {
    const delayMs = new Date(result.publishDateTime).getTime() - Date.now();
    if (delayMs > 0) {
      notificationQueue
        .add(
          'scheduled-news-publish',
          { newsId: result._id.toString(), message: `Scheduled publish for ${result.title}` },
          { delay: delayMs, removeOnComplete: true }
        )
        .catch((err) =>
          logger.error('Failed to schedule delayed news notification job:', err)
        );
    } else {
      result.status = 'publish';
      result.save().then((updated) => {
        broadcastNewsPublishedNotification(updated);
      });
    }
  }

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
// UPDATE (OWNER OR ADMIN VIA TOKEN)
const updateNewsToDB = async (
  newsId: string,
  user: any,
  payload: Partial<INews>
) => {
  const news = await News.findById(newsId);

  if (!news) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'News not found');
  }

  const userId = typeof user === 'object' ? user._id?.toString() : user?.toString();
  const userRole = typeof user === 'object' ? user.role : null;
  const createdBy = news.createdBy ? news.createdBy.toString() : null;

  if (
    userRole !== 'ADMIN' &&
    userRole !== 'SUPER_ADMIN' &&
    (!createdBy || createdBy !== userId)
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not allowed');
  }

  const prevStatus = news.status;
  const wasNotificationSent = news.isNotificationSent;

  const result = await News.findByIdAndUpdate(newsId, payload, {
    new: true,
  });

  if (result) {
    // If updated to publish and notification hasn't been sent yet
    if (result.status === 'publish' && (prevStatus !== 'publish' || !wasNotificationSent)) {
      broadcastNewsPublishedNotification(result).catch((err) =>
        logger.error('Failed to broadcast news notification on update:', err)
      );
    } else if (result.status === 'schedule' && result.publishDateTime && !wasNotificationSent) {
      const delayMs = new Date(result.publishDateTime).getTime() - Date.now();
      if (delayMs > 0) {
        notificationQueue
          .add(
            'scheduled-news-publish',
            { newsId: result._id.toString(), message: `Scheduled publish for ${result.title}` },
            { delay: delayMs, removeOnComplete: true }
          )
          .catch((err) =>
            logger.error('Failed to schedule delayed news notification job:', err)
          );
      } else {
        result.status = 'publish';
        result.save().then((updated) => {
          broadcastNewsPublishedNotification(updated);
        });
      }
    }
  }

  return result;
};

// DELETE (OWNER OR ADMIN VIA TOKEN)
const deleteNewsFromDB = async (newsId: string, user: any) => {
  const news = await News.findById(newsId);

  if (!news) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'News not found');
  }

  const userId = typeof user === 'object' ? user._id?.toString() : user?.toString();
  const userRole = typeof user === 'object' ? user.role : null;
  const createdBy = news.createdBy ? news.createdBy.toString() : null;

  if (
    userRole !== 'ADMIN' &&
    userRole !== 'SUPER_ADMIN' &&
    (!createdBy || createdBy !== userId)
  ) {
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

  const newStatus = news.status === 'publish' ? 'draft' : 'publish';
  news.status = newStatus;
  const result = await news.save();

  if (newStatus === 'publish' && !result.isNotificationSent) {
    broadcastNewsPublishedNotification(result).catch((err) =>
      logger.error('Failed to broadcast news notification on toggle:', err)
    );
  }

  return result;
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

const getNewsAnalyticsFromDB = async () => {
  const [total, published, draft, scheduled] = await Promise.all([
    News.countDocuments(),
    News.countDocuments({ status: 'publish' }),
    News.countDocuments({ status: 'draft' }),
    News.countDocuments({ status: 'schedule' }),
  ]);

  return {
    total,
    published,
    draft,
    scheduled,
  };
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
  getNewsAnalyticsFromDB,
  broadcastNewsPublishedNotification,
  checkAndPublishScheduledNews,
};