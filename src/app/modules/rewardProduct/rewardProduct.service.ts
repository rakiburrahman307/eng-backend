import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import QueryBuilder from '../../../util/queryBilter';
import { IRewardProduct } from './rewardProduct.interface';
import { RewardProduct } from './rewardProduct.model';

// CREATE
const createRewardProductToDB = async (
  payload: IRewardProduct,
  userId: string
) => {
  const result = await RewardProduct.create({
    ...payload,
    createdBy: userId,
  });

  return result;
};

// GET ALL
const getAllRewardProductsFromDB = async (
  query: Record<string, any>
) => {
  const rewardQuery = new QueryBuilder(
    RewardProduct.find(),
    query
  )
    .search(['brand'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await rewardQuery.modelQuery;

  const meta =
    await rewardQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

// GET SINGLE
const getSingleRewardProductFromDB = async (
  id: string
) => {
  const result = await RewardProduct.findById(id);

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Reward product not found'
    );
  }

  return result;
};

// UPDATE
const updateRewardProductToDB = async (
  id: string,
  payload: Partial<IRewardProduct>
) => {
  const rewardProduct =
    await RewardProduct.findById(id);

  if (!rewardProduct) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Reward product not found'
    );
  }

  const result =
    await RewardProduct.findByIdAndUpdate(
      id,
      payload,
      {
        new: true,
      }
    );

  return result;
};

// DELETE
const deleteRewardProductToDB = async (
  id: string
) => {
  const rewardProduct =
    await RewardProduct.findById(id);

  if (!rewardProduct) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Reward product not found'
    );
  }

  return await RewardProduct.findByIdAndDelete(
    id
  );
};

// TOGGLE STATUS
const toggleRewardProductStatusToDB = async (
  id: string
) => {
  const rewardProduct =
    await RewardProduct.findById(id);

  if (!rewardProduct) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Reward product not found'
    );
  }

  rewardProduct.status =
    rewardProduct.status === 'publish'
      ? 'unpublish'
      : 'publish';

  return await rewardProduct.save();
};

export const RewardProductService = {
  createRewardProductToDB,
  getAllRewardProductsFromDB,
  getSingleRewardProductFromDB,
  updateRewardProductToDB,
  deleteRewardProductToDB,
  toggleRewardProductStatusToDB,
};