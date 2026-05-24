
import QueryBuilder from "../../../util/queryBuilder";
import { IEvent } from './event.interface';
import { Event } from './event.module';

// CREATE
const createEventToDB = async (payload: IEvent, userId: string) => {
  return await Event.create({
    ...payload,
    createdBy: userId,
  });
};

// GET ALL
const getAllEventsFromDB = async (query: Record<string, any>) => {
  const eventQuery = new QueryBuilder(
    Event.find(),
    query
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

export const EventService = {
  createEventToDB,
  getAllEventsFromDB,
  getSingleEventFromDB,
  updateEventToDB,
  deleteEventFromDB,
};