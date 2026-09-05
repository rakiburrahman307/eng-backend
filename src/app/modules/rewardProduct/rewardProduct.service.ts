import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import QueryBuilder from "../../../util/queryBuilder";
import { IRewardProduct } from "./rewardProduct.interface";
import { RewardProduct } from "./rewardProduct.model";
import { User } from '../user/user.model';
import { Subscription } from '../subscription/subscription.model';
import { isPremiumPlayerPackage } from '../../../helpers/packageHelper';

// CREATE
const createRewardProductToDB = async (
  payload: IRewardProduct,
  userId: string,
) => {
  const result = await RewardProduct.create({
    ...payload,
    createdBy: userId,
  });

  return result;
};

// GET ALL
const getAllRewardProductsFromDB = async (query: Record<string, any>) => {
  const rewardQuery = new QueryBuilder(RewardProduct.find(), query)
    .search(["brand"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await rewardQuery.modelQuery.populate({
    path: 'redeemedUsers.user',
    select: 'userName firstName lastName email emergencyEmail phone profile role selectTeam parentId',
    populate: {
      path: 'parentId',
      select: 'email emergencyEmail phone',
    },
  });

  const meta = await rewardQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};




// GET SINGLE
const getSingleRewardProductFromDB = async (
  id: string
) => {
  const result = await RewardProduct.findById(id).populate({
    path: 'redeemedUsers.user',
    select: 'userName firstName lastName email emergencyEmail phone profile role selectTeam parentId',
    populate: {
      path: 'parentId',
      select: 'email emergencyEmail phone',
    },
  });

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

// GET QR CODE (ONLY FOR Coffee PRODUCT TYPE)
const getRewardProductQrCodeFromDB = async (id: string) => {
  const rewardProduct = await RewardProduct.findById(id).populate({
    path: 'redeemedUsers.user',
    select: 'userName firstName lastName fullName email emergencyEmail phone profile role selectTeam parentId',
    populate: {
      path: 'parentId',
      select: 'email emergencyEmail phone',
    },
  });

  if (!rewardProduct) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reward product not found');
  }

  // ☕ ONLY ALLOW COFFEE PRODUCTS FOR QR CODE GENERATION
  if (rewardProduct.productType !== 'Coffee') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'QR codes can only be generated for Coffee reward products! nonCoffee items are not eligible.'
    );
  }

  if (!rewardProduct.rewardToken) {
    rewardProduct.rewardToken =
      'rp_reward_' +
      Math.random().toString(36).substring(2, 10) +
      Date.now().toString(36);
    await rewardProduct.save();
  }

  const qrPayload = {
    type: 'REWARD_PRODUCT',
    productId: rewardProduct._id?.toString(),
    productType: rewardProduct.productType,
    brand: rewardProduct.brand,
    point: rewardProduct.point,
    rewardToken: rewardProduct.rewardToken,
  };

  return {
    productId: rewardProduct._id,
    brand: rewardProduct.brand,
    productType: rewardProduct.productType,
    point: rewardProduct.point,
    rewardToken: rewardProduct.rewardToken,
    qrPayloadString: JSON.stringify(qrPayload),
    qrPayload,
    redeemedUsers: rewardProduct.redeemedUsers || [],
  };
};

// REDEEM COFFEE REWARD PRODUCT (NO USER LIMIT - UNLIMITED REDEMPTIONS PERMITTED)
const redeemCoffeeRewardInDB = async (
  userId: string,
  payload: {
    productId?: string;
    rewardToken?: string;
    qrData?: string;
    playerId?: string;
  }
) => {
  let productId = payload.productId;
  let rewardToken = payload.rewardToken;
  let targetPlayerId = payload.playerId;

  if (payload.qrData) {
    try {
      const parsed =
        typeof payload.qrData === 'string'
          ? JSON.parse(payload.qrData)
          : payload.qrData;
      if (parsed.productId) productId = parsed.productId;
      if (parsed.rewardToken) rewardToken = parsed.rewardToken;
      if (parsed.playerId) targetPlayerId = parsed.playerId;
    } catch {
      // ignore
    }
  }

  const finalPlayerId = targetPlayerId || userId;
  if (!finalPlayerId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Player ID or User ID is required for reward redemption'
    );
  }

  let rewardProduct: any = null;
  if (productId) {
    rewardProduct = await RewardProduct.findById(productId);
  } else if (rewardToken) {
    rewardProduct = await RewardProduct.findOne({ rewardToken });
  }

  if (!rewardProduct) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reward product not found');
  }

  if (rewardProduct.productType !== 'Coffee') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'QR code redemption is strictly available for Coffee reward products only.'
    );
  }

  if (rewardProduct.status !== 'publish') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This Coffee reward product is not active for redemption.'
    );
  }

  const user = await User.findById(finalPlayerId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Player profile not found');
  }

  if (user.status !== 'APPROVED') {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only approved players can redeem Coffee rewards!'
    );
  }

  const activeSubscription = await Subscription.findOne({
    user: user._id,
    status: 'active',
  }).populate('package');

  if (!activeSubscription || !activeSubscription.package) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Player must have an active subscription package to redeem rewards!'
    );
  }

  const pkg = activeSubscription.package as any;
  const isPremium = await isPremiumPlayerPackage(pkg);

  if (!isPremium || pkg.packageType === 'Semi Pro') {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only Premium subscription package holders are allowed to redeem rewards!'
    );
  }

  const requiredPoints = Number(rewardProduct.point) || 0;
  const currentCoins = Number(user.engCoine) || 0;

  if (currentCoins < requiredPoints) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Insufficient ENG Coins! You have ${currentCoins} coins, but this Coffee reward costs ${requiredPoints} coins.`
    );
  }

  // ♾️ NO USER LIMITATION! Unlimited redemptions permitted!
  if (!rewardProduct.redeemedUsers) {
    rewardProduct.redeemedUsers = [];
  }

  const playerObjectId = new Types.ObjectId(finalPlayerId);

  rewardProduct.redeemedUsers.push({
    user: playerObjectId,
    redeemedAt: new Date(),
    points: requiredPoints,
  });

  await rewardProduct.save();

  // 💰 DEDUCT COINS & UPDATE MARKET VALUE FOR THE PLAYER
  user.engCoine = currentCoins + requiredPoints;
  user.marketValue = user.engCoine * 100;
  await user.save();

  const getValidEmail = (val?: string | null) =>
    val && typeof val === 'string' && val.includes('@') ? val : '';

  let userEmail =
    getValidEmail(user.email) ||
    getValidEmail(user.emergencyEmail);

  if (!userEmail && user.parentId) {
    const parentUser = await User.findById(user.parentId).select('email emergencyEmail');
    if (parentUser) {
      userEmail =
        getValidEmail(parentUser.email) ||
        getValidEmail(parentUser.emergencyEmail);
    }
  }

  const computedName =
    (user as any).fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.userName ||
    'Player';

  const playerRedeemCount = rewardProduct.redeemedUsers.filter(
    (ru: any) => ru.user.toString() === finalPlayerId.toString()
  ).length;

  return {
    productId: rewardProduct._id,
    brand: rewardProduct.brand,
    productType: rewardProduct.productType,
    pointCost: requiredPoints,
    playerId: user._id,
    playerName: computedName,
    email: userEmail,
    remainingEngCoine: user.engCoine,
    marketValue: user.marketValue,
    redeemedAt: new Date(),
    totalTimesRedeemedByPlayer: playerRedeemCount,
    totalRedemptionsCount: rewardProduct.redeemedUsers.length,
  };
};

export const RewardProductService = {
  createRewardProductToDB,
  getAllRewardProductsFromDB,
  getSingleRewardProductFromDB,
  updateRewardProductToDB,
  deleteRewardProductToDB,
  toggleRewardProductStatusToDB,
  getRewardProductQrCodeFromDB,
  redeemCoffeeRewardInDB,
};