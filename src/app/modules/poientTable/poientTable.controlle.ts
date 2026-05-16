import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PointTableService } from './poientTable.service';


const getPointTable = catchAsync(async (req: Request, res: Response) => {
  const result = await PointTableService.getPointTableFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Point table retrieved successfully',
    data: result,
  });
});

export const PointTableController = {
  getPointTable,
};