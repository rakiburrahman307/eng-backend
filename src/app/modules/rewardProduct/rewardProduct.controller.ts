import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { RewardProductService } from './rewardProduct.service';


// CREATE
const createRewardProduct = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as any;

    const files = req.files as {
      image?: Express.Multer.File[];
    };

    const image = files?.image?.[0];

    const data = req.body?.data
      ? JSON.parse(req.body.data)
      : {};

    const payload: any = {
      ...data,
    };

    if (image) {
      payload.image = image.path
        .replace(/\\/g, '/')
        .split('uploads')[1];
    }

    const result =
      await RewardProductService.createRewardProductToDB(
        payload,
        user._id
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Reward product created successfully',
      data: result,
    });
  }
);

// GET ALL
const getAllRewardProducts = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await RewardProductService.getAllRewardProductsFromDB(
        req.query
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Reward products retrieved successfully',
      pagination: result.meta,
      data: result.result,
    });
  }
);

//getAdmin


// GET SINGLE
const getSingleRewardProduct = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await RewardProductService.getSingleRewardProductFromDB(
        req.params.id as string,
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Reward product retrieved successfully',
      data: result,
    });
  }
);

// UPDATE
const updateRewardProduct = catchAsync(
  async (req: Request, res: Response) => {
    const files = req.files as {
      image?: Express.Multer.File[];
    };

    const image = files?.image?.[0];

    const data = req.body?.data
      ? JSON.parse(req.body.data)
      : {};

    const payload: any = {
      ...data,
    };

    if (image) {
      payload.image = image.path
        .replace(/\\/g, '/')
        .split('uploads')[1];
    }

    const result =
      await RewardProductService.updateRewardProductToDB(
        req.params.id as string,
        payload
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Reward product updated successfully',
      data: result,
    });
  }
);

// DELETE
const deleteRewardProduct = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await RewardProductService.deleteRewardProductToDB(
        req.params.id as string,
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Reward product deleted successfully',
      data: result,
    });
  }
);

// TOGGLE STATUS
const toggleRewardProductStatus = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await RewardProductService.toggleRewardProductStatusToDB(
        req.params.id as string,
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message:
        'Reward product status toggled successfully',
      data: result,
    });
  }
);

export const RewardProductController = {
  createRewardProduct,
  getAllRewardProducts,
  getSingleRewardProduct,
  updateRewardProduct,
  deleteRewardProduct,
    toggleRewardProductStatus,

};