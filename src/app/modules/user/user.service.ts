import { USER_ROLES } from "../../../enums/user";
import { IUser } from "./user.interface";
import { JwtPayload } from 'jsonwebtoken';
import { User } from "./user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import generateOTP from "../../../util/generateOTP";
import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";
import unlinkFile from "../../../shared/unlinkFile";
import { Subscription } from "../subscription/subscription.model";
import {
  sendNotificationToAdmins,
  sendNotification,
} from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.interface";
import { PlayerEconomy } from "../coinAndBudget/playerEconomySchema.model";





const createAdminToDB = async (payload: any): Promise<IUser> => {

    // check admin is exist or not;
    const isExistAdmin = await User.findOne({ email: payload.email })
    if (isExistAdmin) {
        throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
    }

    // create admin to db
    const createAdmin = await User.create(payload);
    if (!createAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
    } else {
        await User.findByIdAndUpdate({ _id: createAdmin?._id }, { verified: true }, { new: true });
    }

    return createAdmin;
}

const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {

    const createUser = await User.create(payload);
    if (!createUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
    }

    //send email
    const otp = generateOTP();
    const values = {
        name: createUser.userName,
        otp: otp,
        email: createUser.email!
    };

    const createAccountTemplate = emailTemplate.createAccount(values);
    emailHelper.sendEmail(createAccountTemplate);

    //save to DB
    const authentication = {
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60000),
    };

    await User.findOneAndUpdate(
        { _id: createUser._id },
        { $set: { authentication } }
    );

    // 🔔 Notify all admins: new user registered
    await sendNotificationToAdmins({
      title: "New User Registered",
      message: `A new user (${createUser.email}) has registered on the platform.`,
      type: NOTIFICATION_TYPE.USER_REGISTERED,
      metadata: {
        userId: createUser._id,
        email: createUser.email,
        role: createUser.role,
      },
    });

    return createUser;
};

const getUserProfileFromDB = async (user: JwtPayload) => {
 

  const id = user?._id;

  if (!id) {

    return null;
  }



  const isExistUser = await User.findById(id);

  if (!isExistUser) {

    return null;
  }

  // user details are merged into user
  const userDetails = isExistUser;



  // active subscription
  const subscription = await Subscription.findOne({
    user: id,
    status: "active",
  }).populate("package");

  return {
    _id: isExistUser._id,
    email: isExistUser.email,
    userName: isExistUser.userName,
    profile: isExistUser.profile,
    role: isExistUser.role,

    firstName: userDetails?.firstName || null,
    lastName: userDetails?.lastName || null,
    status: userDetails?.status || "PENDING",

    subscription: subscription
      ? {
          _id: subscription._id,
          price: subscription.price,
          trxId: subscription.trxId,
          subscriptionId: subscription.subscriptionId,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          remaining: subscription.remaining,
          status: subscription.status,

          package: subscription.package,
        }
      : false,
  };
};

const updateProfileToDB = async (user: JwtPayload, payload: Partial<IUser>): Promise<Partial<IUser | null>> => {
    const { _id } = user;
    const isExistUser = await User.isExistUserById(_id);
    if (!isExistUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }

    //unlink file here
    if (payload.profile) {
        unlinkFile(isExistUser.profile);
    }

    const updateDoc = await User.findOneAndUpdate(
        { _id: _id },
        payload,
        { new: true }
    );
    return updateDoc;
};



const createPlayerToDB = async (payload: any) => {
  // Assign starting market value from PlayerEconomy config in DB
  if (payload.marketValue === undefined) {
    const pe = await PlayerEconomy.findOne();
    payload.marketValue = pe ? pe.startingMarketValue : 100000;
  }
  // Find the user to get their role
  const user = await User.findById(payload.userId);
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  const result = await User.findOneAndUpdate(
    { _id: payload.userId },
    payload,
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create player");
  }

  const role = user?.role || "USER";

  // 🔔 Notify all admins: new player/referee/manager/club profile created
  await sendNotificationToAdmins({
    title: `New ${role} Profile Submitted`,
    message: `A ${role.toLowerCase()} (${result.firstName} ${result.lastName}) has submitted their profile for review.`,
    type: NOTIFICATION_TYPE.PLAYER_PROFILE_CREATED,
    metadata: {
      userId: payload.userId,
      role: role,
    },
  });

  return result;
};


const updatePlayerByUserId = async (
  userId: string,
  payload: any
) => {
  const isExist = await User.findById(userId);

  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player not found");
  }

  const result = await User.findByIdAndUpdate(
    userId,
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  return result;
};



const getPlayerByUserId = async (userId: string) => {
  const result = await User.findById(userId).populate({
    path: "selectTeam",
    select: "teamName", // Team model e jei field e team name ache
  }).lean();

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Player not found"
    );
  }

  return { ...result, userId: result._id };
};


const getManagerByUserId = async (
  userId: string
) => {
  const result = await User.findById(userId)
    .populate('selectTeam', 'teamName')
    .lean();

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Manager not found'
    );
  }

  return {
    ...result,
    userId: result._id,
    selectTeam: result.selectTeam
      ? {
          id: (result.selectTeam as any)._id,
          teamName: (result.selectTeam as any).teamName,
        }
      : null,
  };
};


const getRefereeByUserId = async (
  userId: string
) => {
  const result = await User.findById(userId).lean();

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Referee not found'
    );
  }

  return { ...result, userId: result?._id };
};



const getOtherClubByUserId = async (
  userId: string
) => {
  const result = await User.findById(userId).lean();

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Other club not found'
    );
  }

  return { ...result, userId: result?._id };
};



const getOtherClubByUserIdUserId = async (userId: string) => {
  const result = await User.findById(userId)
    .populate({
      path: 'selectTeam',
      select: 'teamName _id',
    })
    .lean();

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Other club not found');
  }

  return {
    ...result,

    // team only name
      selectTeam: (result.selectTeam as any)?.teamName || null,
      selectTeamId: (result.selectTeam as any)?._id || null,

    userId: result._id,
  };
};


// UPDATE USER COIN OR MARKET VALUE (Admin only)
const updateUserCoinOrMarketValue = async (
  userId: string,
  payload: { engCoine?: number; marketValue?: number }
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const updateData: Record<string, number> = {};

  if (payload.engCoine !== undefined) {
    if (typeof payload.engCoine !== 'number' || payload.engCoine < 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'engCoine must be a non-negative number');
    }
    updateData.engCoine = payload.engCoine;
  }

  if (payload.marketValue !== undefined) {
    if (typeof payload.marketValue !== 'number' || payload.marketValue < 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'marketValue must be a non-negative number');
    }
    updateData.marketValue = payload.marketValue;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'At least one field (engCoine or marketValue) must be provided');
  }

  return await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

export const UserService = {
    createUserToDB,
    getUserProfileFromDB,
    updateProfileToDB,
    createAdminToDB,
    createPlayerToDB,
    updatePlayerByUserId,
    getPlayerByUserId,
    getManagerByUserId,
    getRefereeByUserId,
    getOtherClubByUserId,
    getOtherClubByUserIdUserId,
    updateUserCoinOrMarketValue,
};