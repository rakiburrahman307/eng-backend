import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TransferService } from './transfer.service';

const createTransfer = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await TransferService.createTransferToDB(
    req.body,
    user._id
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transfer request created',
    data: result,
  });
});

const getAllTransfers = catchAsync(async (req: Request, res: Response) => {
  const result = await TransferService.getAllTransfersFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All transfers retrieved',
    data: result,
  });
});

const getMyTransfers = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await TransferService.getMyTransfersFromDB(user._id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My transfers retrieved',
    data: result,
  });
});

const getSingleTransfer = catchAsync(async (req: Request, res: Response) => {
  const result = await TransferService.getSingleTransferFromDB(req.params.id as string);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transfer retrieved',
    data: result,
  });
});

const approveTransfer = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await TransferService.approveTransferToDB(
    req.params.id as string,
    user._id
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transfer approved',
    data: result,
  });
});

const rejectTransfer = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await TransferService.rejectTransferToDB(
    req.params.id as string,
    req.body.reason,
    user._id
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transfer rejected',
    data: result,
  });
});

const withdrawTransfer = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await TransferService.withdrawTransferToDB(
    req.params.id as string,
    user._id
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transfer withdrawn',
    data: result,
  });
});

export const TransferController = {
  createTransfer,
  getAllTransfers,
  getMyTransfers,
  getSingleTransfer,
  approveTransfer,
  rejectTransfer,
  withdrawTransfer,
};