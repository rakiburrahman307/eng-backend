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
import { UserDetails } from "./userDetails.model";
import { Subscription } from "../subscription/subscription.model";
import {
  sendNotificationToAdmins,
  sendNotification,
} from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.interface";

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

  // user details
  const userDetails = await UserDetails.findOne({ userId: id }).select(
    "firstName lastName status"
  );



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
  const result = await UserDetails.create(payload);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create player");
  }

  // Find the user to get their role
  const user = await User.findById(payload.userId);
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
  const isExist = await UserDetails.findOne({ userId });

  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player not found");
  }

  const result = await UserDetails.findOneAndUpdate(
    { userId },
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  return result;
};



const getPlayerByUserId = async (userId: string) => {
  const result = await UserDetails.findOne({
    userId,
  }).populate({
    path: "selectTeam",
    select: "teamName", // Team model e jei field e team name ache
  });

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Player not found"
    );
  }

  return result;
};


const getManagerByUserId = async (
  userId: string
) => {
  const result = await UserDetails.findOne({
    userId,
  })
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
  const result = await UserDetails.findOne({
    userId,
  });

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Referee not found'
    );
  }

  return result;
};



const getOtherClubByUserId = async (
  userId: string
) => {
  const result = await UserDetails.findOne({
    userId,
  });

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Other club not found'
    );
  }

  return result;
};



const getOtherClubByUserIdUserId = async (userId: string) => {
  const result = await UserDetails.findOne({ userId })
    .populate({
      path: 'selectTeam',
      select: 'teamName _id',
    })
    .populate({
      path: 'userId',
      select: 'profile',
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

    // flatten user profile (NO userId object)
    profile: (result.userId as any)?.profile || null,

    // remove full user object
    userId: undefined,
  };
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
    getOtherClubByUserIdUserId
};