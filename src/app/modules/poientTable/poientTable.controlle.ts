import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PointTableService } from './poientTable.service';

const getPointTable = catchAsync(async (req: Request, res: Response) => {
  const result = await PointTableService.getPointTable(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Point table retrieved successfully',
    data: result,
  });
});

const updatePointTable = catchAsync(async (req: Request, res: Response) => {
  const result = await PointTableService.updatePointTable(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Point table updated successfully',
    data: result,
  });
});

const resetPointTable = catchAsync(async (req: Request, res: Response) => {
  const result = await PointTableService.resetPointTable(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Point table reset to auto-calculated successfully',
    data: result,
  });
});

const getPointTableOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await PointTableService.getPointTableOverview(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Point table overview retrieved successfully',
    data: result,
  });
});

export const PointTableController = {
  getPointTable,
  getPointTableOverview,
  updatePointTable,
  resetPointTable,
};