import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { EventService } from './event.service';

// CREATE EVENT
const createEvent = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const files = req.files as {
    image?: Express.Multer.File[];
  };

  const image = files?.image?.[0];

  const data = req.body?.data ? JSON.parse(req.body.data) : {};

  const payload: any = {
    ...data,
  };

  // remove client publishDateTime input
  delete payload.publishDateTime;

  // image handle
  if (image) {
    payload.image = image.path
      .replace(/\\/g, '/')
      .split('uploads')[1];
  }

  // auto publish logic
  if (payload.status === 'publish') {
    payload.publishDateTime = new Date();
  } else {
    payload.publishDateTime = null;
  }

  const result = await EventService.createEventToDB(payload, user._id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Event created successfully',
    data: result,
  });
});

// GET ALL EVENTS
const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const result = await EventService.getAllEventsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Events retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

const getPublicEvents = catchAsync(async (req: Request, res: Response) => {
  const result = await EventService.getPublicEventsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Public events retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

// GET SINGLE EVENT
const getSingleEvent = catchAsync(async (req: Request, res: Response) => {
    if (!req.params.id) {
        throw new Error('Event ID is required');
    }
  const result = await EventService.getSingleEventFromDB(req.params.id as string);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Event retrieved successfully',
    data: result,
  });
});

// UPDATE EVENT
const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const files = req.files as {
    image?: Express.Multer.File[];
  };

  const image = files?.image?.[0];

  // parse form-data json safely
  const data = req.body?.data
    ? JSON.parse(req.body.data)
    : {};

  const payload: any = {
    ...data,
  };

  // image upload
  if (image) {
    payload.image = image.path
      .replace(/\\/g, '/')
      .split('uploads')[1];
  }

  // publish logic
  if (payload.status === 'publish') {
    payload.publishDateTime = new Date();
  }

  // draft logic
  if (payload.status === 'draft') {
    payload.publishDateTime = null;
  }

  // schedule validation
  if (
    payload.status === 'schedule' &&
    !payload.publishDateTime
  ) {
    throw new Error(
      'publishDateTime is required for schedule status'
    );
  }

  // future date validation
  if (
    payload.status === 'schedule' &&
    new Date(payload.publishDateTime) < new Date()
  ) {
    throw new Error(
      'Schedule time must be a future date'
    );
  }

  const result = await EventService.updateEventToDB(
    id,
    payload
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Event updated successfully',
    data: result,
  });
});


// DELETE EVENT
const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await EventService.deleteEventFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Event deleted successfully',
    data: result,
  });
});

export const EventController = {
  createEvent,
  getAllEvents,
  getSingleEvent,
  updateEvent,
  deleteEvent,
  getPublicEvents
};