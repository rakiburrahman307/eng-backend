import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { VenueService } from './venue.service';

const createVenue = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { image?: Express.Multer.File[] };
  const imageFile = files?.image?.[0];

  let bodyData: any = {};
  if (req.body?.data) {
    try {
      bodyData = JSON.parse(req.body.data);
    } catch (e) {
      bodyData = req.body;
    }
  } else {
    bodyData = req.body;
  }

  if (imageFile) {
    bodyData.image = `/images/${imageFile.filename}`;
  }

  const result = await VenueService.createVenueToDB(bodyData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Venue created successfully',
    data: result,
  });
});

const getAllVenues = catchAsync(async (req: Request, res: Response) => {
  const result = await VenueService.getAllVenuesFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Venues retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

const getSingleVenue = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await VenueService.getSingleVenueFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Venue retrieved successfully',
    data: result,
  });
});

const updateVenue = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const files = req.files as { image?: Express.Multer.File[] };
  const imageFile = files?.image?.[0];

  let bodyData: any = req.body;
  if (req.body?.data) {
    try {
      bodyData = JSON.parse(req.body.data);
    } catch (e) {}
  }

  const payload: any = { ...bodyData };
  if (imageFile) {
    payload.image = `/images/${imageFile.filename}`;
  }

  const result = await VenueService.updateVenueInDB(id, payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Venue updated successfully',
    data: result,
  });
});

const deleteVenue = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await VenueService.deleteVenueFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Venue deleted successfully',
    data: result,
  });
});

export const VenueController = {
  createVenue,
  getAllVenues,
  getSingleVenue,
  updateVenue,
  deleteVenue,
};
