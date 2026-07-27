import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiErrors';
import QueryBuilder from "../../../util/queryBuilder";
import { User } from '../user/user.model';
import { RewardProduct } from '../rewardProduct/rewardProduct.model';
import { RewardOrder } from './rewardOrder.model';
import { sendNotification, sendNotificationToAdmins } from '../../../helpers/notificationsHelper';
import { NOTIFICATION_TYPE } from '../notification/notification.interface';

// CREATE ORDER
const createRewardOrderToDB = async (
  payload: any,
  userId: string
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findById(userId).session(session);

    if (!user) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "User not found"
      );
    }

    const rewardProduct = await RewardProduct.findById(
      payload.rewardProduct
    ).session(session);

    if (!rewardProduct) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Reward product not found"
      );
    }

    if (rewardProduct.status !== "publish") {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Reward product is not available"
      );
    }

    // User current ENG Coins
    const userCoin = user.engCoine || 0;

    if (userCoin < rewardProduct.point) {

      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Insufficient reward points"
      );
    }

    // Deduct ENG Coins
    user.engCoine = userCoin - rewardProduct.point;

    await user.save({ session });



    // Create Reward Order
    const order = await RewardOrder.create(
      [
        {
          user: user._id,
          rewardProduct: rewardProduct._id,
          pointUsed: rewardProduct.point,
        },
      ],
      { session }
    );



    await session.commitTransaction();
    session.endSession();



    // Notify Player

    await sendNotification({
      receiver: userId,
      title: "Reward Order Placed 🎁",
      message: `Your reward order has been placed successfully. ${rewardProduct.point} points have been deducted from your ENG Coins.`,
      type: NOTIFICATION_TYPE.REWARD_ORDER_PLACED,
      metadata: {
        orderId: order[0]._id,
        productId: rewardProduct._id,
      },
    });


    // Notify Admins
    console.log("Sending notification to admins...");
    await sendNotificationToAdmins({
      title: "New Reward Order",
      message:
        "A player has placed a new reward order. Please review and approve.",
      type: NOTIFICATION_TYPE.REWARD_ORDER_PLACED,
      metadata: {
        orderId: order[0]._id,
      },
    });

    console.log("✅ Admin notification sent");
    console.log("========== SUCCESS ==========");

    return order[0];
  } catch (error) {
    console.log("========== ERROR ==========");
    console.error(error);

    await session.abortTransaction();
    session.endSession();

    console.log("❌ Transaction aborted");

    throw error;
  }
};

// GET ALL
const getAllRewardOrdersFromDB = async (
  query: Record<string, any>
) => {
  const rewardOrderQuery = new QueryBuilder(
    RewardOrder.find()
      .populate({
        path: 'user',
        select: 'userName firstName lastName',
      })
      .populate({
        path: 'rewardProduct',
        select: 'brand point',
      })
      .populate({
        path: 'approvedBy',
        select: 'firstName lastName',
      }),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const orders = await rewardOrderQuery.modelQuery;

  const meta = await rewardOrderQuery.getPaginationInfo();

  const result = orders.map(
    (order: any, index: number) => ({
      id: order._id,
      userId: order.user?._id,
      userName: order.user?.userName,
      firstName: order.user?.firstName,
      lastName: order.user?.lastName,
      brandName: order.rewardProduct?.brand,
      point: order.rewardProduct?.point,
      pointUsed: order.pointUsed,
      status: order.status,
      updatedAt: order.updatedAt,
    })
  );

  return {
    meta,
    result,
  };
};

// MY ORDERS
const getMyRewardOrdersFromDB = async (
  userId: string
) => {
  return await RewardOrder.find({
    user: userId,
  })
    .populate('rewardProduct')
    .sort({ createdAt: -1 });
};

// SINGLE
const getSingleRewardOrderFromDB = async (
  id: string
) => {
  const result = await RewardOrder.findById(id)
    .populate('user')
    .populate('rewardProduct')
    .populate('approvedBy');

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Reward order not found'
    );
  }

  return result;
};

// APPROVE
const approveRewardOrderToDB = async (
  id: string,
  adminId: string
) => {
  const order = await RewardOrder.findById(id);

  if (!order) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Reward order not found'
    );
  }

  if (order.status !== 'pending') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending orders can be approved'
    );
  }

  order.status = 'approved';
  order.approvedBy = adminId as any;
  order.approvedAt = new Date();

  await order.save();

  // 🔔 Notify player: order approved
  await sendNotification({
    receiver: order.user.toString(),
    title: '✅ Reward Order Approved!',
    message: 'Your reward order has been approved! It will be delivered to you soon.',
    type: NOTIFICATION_TYPE.REWARD_ORDER_APPROVED,
    metadata: { orderId: order._id },
  });

  return order;
};

// REJECT
const rejectRewardOrderToDB = async (
  id: string,
  rejectReason: string | undefined,
  adminId: string
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await RewardOrder.findById(id)
      .populate('rewardProduct')
      .session(session);

    if (!order) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Reward order not found'
      );
    }

    if (order.status !== 'pending') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Only pending orders can be rejected'
      );
    }

    // RETURN POINT
    const user = await User.findById(order.user).session(
      session
    );

    if (!user) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'User not found'
      );
    }

    // Refund points to user's ENG Coins (primary) and reward points (legacy)
    user.engCoine = (user.engCoine || 0) + order.pointUsed;
    user.rewardPoint = (user.rewardPoint || 0) + order.pointUsed;

    await user.save({ session });

    // UPDATE ORDER
    order.status = 'rejected';
    if (rejectReason) {
      order.rejectReason = rejectReason;
    }
    order.approvedBy = adminId as any;

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    const reasonText = rejectReason ? ` Reason: ${rejectReason}` : '';
    // 🔔 Notify player: order rejected + points refunded
    await sendNotification({
      receiver: order.user.toString(),
      title: 'Reward Order Rejected',
      message: `Your reward order has been rejected. ${order.pointUsed} points have been refunded to your account.${reasonText}`,
      type: NOTIFICATION_TYPE.REWARD_ORDER_REJECTED,
      metadata: { orderId: order._id, pointsRefunded: order.pointUsed },
    });

    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
};

// DELIVERED
const deliveredRewardOrderToDB = async (
  id: string
) => {
  const order = await RewardOrder.findById(id);

  if (!order) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Reward order not found'
    );
  }

  if (order.status !== 'approved') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only approved orders can be delivered'
    );
  }

  order.status = 'delivered';

  await order.save();

  // 🔔 Notify player: order delivered
  await sendNotification({
    receiver: order.user.toString(),
    title: '🚚 Reward Order Delivered!',
    message: 'Your reward order has been delivered! Enjoy your reward.',
    type: NOTIFICATION_TYPE.REWARD_ORDER_DELIVERED,
    metadata: { orderId: order._id },
  });

  return order;
};

export const RewardOrderService = {
  createRewardOrderToDB,
  getAllRewardOrdersFromDB,
  getMyRewardOrdersFromDB,
  getSingleRewardOrderFromDB,
  approveRewardOrderToDB,
  rejectRewardOrderToDB,
  deliveredRewardOrderToDB,
};