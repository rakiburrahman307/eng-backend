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

    return createUser;
};

const getUserProfileFromDB = async (user: JwtPayload) => {
  console.log("🧠 SERVICE CALLED WITH USER:", user);

  const id = user?._id;

  if (!id) {
    console.log("❌ No ID in token");
    return null;
  }

  console.log("🔎 Searching user by ID:", id);

  const isExistUser = await User.findById(id);

  if (!isExistUser) {
    console.log("❌ USER NOT FOUND IN USER COLLECTION");
    return null;
  }

  const userDetails = await UserDetails.findOne({ userId: id }).select(
    "firstName lastName status"
  );

  console.log("📄 UserDetails found:", !!userDetails);

  return {
    _id: isExistUser._id,
      email: isExistUser.email,
      userName: isExistUser.userName,
    profile: isExistUser.profile,
    role: isExistUser.role,

    firstName: userDetails?.firstName || null,
    lastName: userDetails?.lastName || null,
    status: userDetails?.status || "PENDING",
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

export const UserService = {
    createUserToDB,
    getUserProfileFromDB,
    updateProfileToDB,
    createAdminToDB,
    createPlayerToDB,
    updatePlayerByUserId
};