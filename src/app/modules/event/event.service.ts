
import QueryBuilder from "../../../util/queryBuilder";
import { IEvent } from './event.interface';
import { Event } from './event.module';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiErrors';
import { StatusCodes } from 'http-status-codes';

// CREATE
const createEventToDB = async (payload: IEvent, userId: string) => {
  return await Event.create({
    ...payload,
    createdBy: userId,
  });
};

// GET ALL
const getAllEventsFromDB = async (query: Record<string, any>) => {
  const queryWithDefaultSort = {
    sort: 'order -createdAt',
    ...query,
  };

  const eventQuery = new QueryBuilder(
    Event.find(),
    queryWithDefaultSort
  )
    .search(['title', 'description', 'location'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await eventQuery.modelQuery;
  const meta = await eventQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};


const getPublicEventsFromDB = async (
  query: Record<string, any>
) => {
  const queryWithDefaultSort = {
    sort: 'order -createdAt',
    ...query,
  };

  const eventQuery = new QueryBuilder(
    Event.find({ status: 'publish' }),
    queryWithDefaultSort
  )
    .search(['title', 'description', 'location'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await eventQuery.modelQuery;
  const meta = await eventQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};
// SINGLE
const getSingleEventFromDB = async (id: string) => {
  return await Event.findById(id);
};

// UPDATE
const updateEventToDB = async (
  id: string,
  payload: Partial<IEvent>
) => {
  const event = await Event.findById(id);

  if (!event) {
    throw new Error('Event not found');
  }

  const result = await Event.findByIdAndUpdate(
    id,
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  return result;
};


// DELETE
const deleteEventFromDB = async (id: string) => {
  const event = await Event.findById(id);

  if (!event) {
    throw new Error('Event not found');
  }

  return await Event.findByIdAndDelete(id);
};

// REARRANGE EVENTS ORDER
const rearrangeEventsInDB = async (
  payload: { id: string; order: number }[]
) => {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid payload: events array is required');
  }

  const invalidIds = payload.filter((item) => !Types.ObjectId.isValid(item.id));
  if (invalidIds.length > 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid event IDs: ${invalidIds.map((i) => i.id).join(', ')}`);
  }

  const bulkOps = payload.map((item) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(item.id) },
      update: { $set: { order: item.order } },
    },
  }));

  const result = await Event.bulkWrite(bulkOps);
  return { modifiedCount: result.modifiedCount };
};

export const EventService = {
  createEventToDB,
  getAllEventsFromDB,
  getSingleEventFromDB,
  updateEventToDB,
  deleteEventFromDB,
  getPublicEventsFromDB,
  rearrangeEventsInDB,
};