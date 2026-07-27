import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { RewardOrderService } from './rewardOrder.service';


// CREATE
const createRewardOrder = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as any;

    const result =
      await RewardOrderService.createRewardOrderToDB(
        req.body,
        user._id
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Reward order created successfully',
      data: result,
    });
  }
);

// GET ALL
const getAllRewardOrders = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await RewardOrderService.getAllRewardOrdersFromDB(
        req.query
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message:
        'Reward orders retrieved successfully',
      pagination: result.meta,
      data: result.result,
    });
  }
);

// MY ORDERS
const getMyRewardOrders = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as any;

    const result =
      await RewardOrderService.getMyRewardOrdersFromDB(
        user._id
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message:
        'My reward orders retrieved successfully',
      data: result,
    });
  }
);

// SINGLE
const getSingleRewardOrder = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await RewardOrderService.getSingleRewardOrderFromDB(
        req.params.id as string,
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message:
        'Reward order retrieved successfully',
      data: result,
    });
  }
);

// APPROVE
const approveRewardOrder = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as any;

    const result =
      await RewardOrderService.approveRewardOrderToDB(
        req.params.id as string,
        user._id
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message:
        'Reward order approved successfully',
      data: result,
    });
  }
);

// REJECT
const rejectRewardOrder = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as any;

    const result =
      await RewardOrderService.rejectRewardOrderToDB(
        req.params.id as string,
        req.body?.rejectReason,
        user._id
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message:
        'Reward order rejected successfully',
      data: result,
    });
  }
);

// DELIVERED
const deliveredRewardOrder = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await RewardOrderService.deliveredRewardOrderToDB(
        req.params.id as string
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message:
        'Reward order delivered successfully',
      data: result,
    });
  }
);

export const RewardOrderController = {
  createRewardOrder,
  getAllRewardOrders,
  getMyRewardOrders,
  getSingleRewardOrder,
  approveRewardOrder,
  rejectRewardOrder,
  deliveredRewardOrder,
};