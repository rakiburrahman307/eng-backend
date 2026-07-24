import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import ApiError from '../../../errors/ApiErrors';
import { emailHelper } from '../../../helpers/emailHelper';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import {
    IAuthResetPassword,
    IChangePassword,
    ILoginData,
    IVerifyEmail
} from '../../../types/auth';
import cryptoToken from '../../../util/cryptoToken';
import generateOTP from '../../../util/generateOTP';
import { ResetToken } from '../resetToken/resetToken.model';
import { User } from '../user/user.model';
import { IUser } from '../user/user.interface';
import { Subscription } from '../subscription/subscription.model';
import { sendNotification } from '../../../helpers/notificationsHelper';
import { NOTIFICATION_TYPE } from '../notification/notification.interface';

//login
const loginUserFromDB = async (payload: ILoginData) => {

  const { email, password } = payload;

  const isExistUser: any = await User.findOne({ email }).select('+password');

  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  // check verified
  if (!isExistUser.verified) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Please verify your account, then try to login again'
    );
  }

  // ✅ Block login if profile not yet approved by admin
  // Only applies to PLAYER, MANAGER, REFEREE, OTHER_CLUBS
  const rolesRequiringApproval = ['PLAYER', 'MANAGER', 'REFEREE', 'OTHER_CLUBS'];
  if (
    rolesRequiringApproval.includes(isExistUser.role) &&
    isExistUser.status !== 'APPROVED'
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Your account is pending admin approval. Please wait for an admin to approve your profile before logging in.'
    );
  }

  // check password
  if (
    password &&
    !(await User.isMatchPassword(password, isExistUser.password))
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');
  }

  // user details are merged into user
  const userDetails = isExistUser;

  // check active subscription
  const subscription = await Subscription.findOne({
    user: isExistUser._id,
    status: "active",
  });

  // create access token
  const accessToken = jwtHelper.createToken(
    {
      id: isExistUser._id,
      role: isExistUser.role,
      email: isExistUser.email,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  // create refresh token
  const refreshToken = jwtHelper.createToken(
    {
      id: isExistUser._id,
      role: isExistUser.role,
      email: isExistUser.email,
    },
    config.jwt.jwtRefreshSecret as Secret,
    config.jwt.jwtRefreshExpiresIn as string
  );

  return {
    accessToken,
    refreshToken,

    profileStatus: userDetails
      ? userDetails.status
      : "INCOMPLETE",

    paymentStatus: subscription ? true : false,
  };
};

//forget password
const forgetPasswordToDB = async (email: string) => {

    const isExistUser = await User.isExistUserByEmail(email);
    if (!isExistUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
  
    //send mail
    const otp = generateOTP();
    const value = {
        otp,
        email: isExistUser.email
    };

    const forgetPassword = emailTemplate.resetPassword(value);
    emailHelper.sendEmail(forgetPassword);
  
    //save to DB
    const authentication = {
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60000)
    };
    await User.findOneAndUpdate({ email }, { $set: { authentication } });
};
  
//verify email
const verifyEmailToDB = async (payload: IVerifyEmail) => {

    const { email, oneTimeCode } = payload;

    const isExistUser = await User.findOne({ email }).select('+authentication');

    if (!isExistUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }

    if (!oneTimeCode) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Please give the otp');
    }

    if (isExistUser.authentication?.oneTimeCode !== oneTimeCode) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Wrong OTP');
    }

    const date = new Date();
    if (date > isExistUser.authentication?.expireAt) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP expired');
    }

    let message;
    let data;

    const jwt = require("jsonwebtoken");

    // =========================
    // ✅ FIRST TIME EMAIL VERIFY → LOGIN TOKEN
    // =========================
    if (!isExistUser.verified) {

        await User.findOneAndUpdate(
            { _id: isExistUser._id },
            {
                verified: true,
                authentication: {
                    oneTimeCode: null,
                    expireAt: null,
                }
            }
        );

        // 🔥 SAME LOGIN TOKEN LIKE LOGIN API
        data = jwt.sign(
            {
                _id: isExistUser._id,
                email: isExistUser.email,
                role: isExistUser.role,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        // 🔔 Notify user: email verified
        await sendNotification({
            receiver: isExistUser._id.toString(),
            title: "Email Verified Successfully!",
            message: "Welcome! Your email has been verified. You can now access your account.",
            type: NOTIFICATION_TYPE.EMAIL_VERIFIED,
        });

        message = "Email verified successfully";
    }

    // =========================
    // 🔁 FORGOT PASSWORD FLOW → DB TOKEN
    // =========================
    else {

        await User.findOneAndUpdate(
            { _id: isExistUser._id },
            {
                authentication: {
                    isResetPassword: true,
                    oneTimeCode: null,
                    expireAt: null,
                }
            }
        );

        const createToken = cryptoToken();

        await ResetToken.create({
            user: isExistUser._id,
            token: createToken,
            expireAt: new Date(Date.now() + 5 * 60000),
        });

        message = "Verification Successful: Please use code for reset password";
        data = createToken;
    }

    return { data, message };
};
  
//forget password
const resetPasswordToDB = async ( token: string, payload: IAuthResetPassword ) => {

    const { newPassword, confirmPassword } = payload;

    //isExist token
    const isExistToken = await ResetToken.isExistToken(token);
    if (!isExistToken) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }
  
    //user permission check
    const isExistUser = await User.findById(isExistToken.user).select('+authentication');
    if (!isExistUser?.authentication?.isResetPassword) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "You don't have permission to change the password. Please click again to 'Forgot Password'");
    }
  
    //validity check
    const isValid = await ResetToken.isExpireToken(token);
    if (!isValid) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Token expired, Please click again to the forget password');
    }
  
    //check password
    if (newPassword !== confirmPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "New password and Confirm password doesn't match!");
    }
  
    const hashPassword = await bcrypt.hash( newPassword, Number(config.bcrypt_salt_rounds));
  
    const updateData = {
        password: hashPassword,
        authentication: {
            isResetPassword: false,
        }
    };
  
    await User.findOneAndUpdate(
        { _id: isExistToken.user }, 
        updateData,
        {new: true}
    );
};
  
const changePasswordToDB = async ( user: JwtPayload, payload: IChangePassword) => {

    const { currentPassword, newPassword, confirmPassword } = payload;
    const isExistUser = await User.findById(user._id).select('+password');
    if (!isExistUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
  
    //current password match
    if ( currentPassword && !(await User.isMatchPassword(currentPassword, isExistUser.password))) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
    }
  
    //newPassword and current password
    if (currentPassword === newPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Please give different password from current password');
    }

    //new password and confirm password check
    if (newPassword !== confirmPassword) {
        throw new ApiError( StatusCodes.BAD_REQUEST, "Password and Confirm password doesn't matched");
    }
  
    //hash password
    const hashPassword = await bcrypt.hash( newPassword, Number(config.bcrypt_salt_rounds));
  
    const updateData = {
        password: hashPassword,
    };

    await User.findOneAndUpdate({ _id: user._id }, updateData, { new: true });
};


const newAccessTokenToUser = async(token: string)=>{

    // Check if the token is provided
    if (!token) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Token is required!');
    }
  
    const verifyUser = jwtHelper.verifyToken(
      token,
      config.jwt.jwtRefreshSecret as Secret
    );
  
    const isExistUser = await User.findById(verifyUser?.id);
    if(!isExistUser){
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized access")
    }
  
    //create token
    const accessToken = jwtHelper.createToken(
      { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
      config.jwt.jwt_secret as Secret,
      config.jwt.jwt_expire_in as string
    );
  
    return { accessToken }
}
  
const resendVerificationEmailToDB = async (email:string) => {
  
    // Find the user by ID
    const existingUser:any = await User.findOne({email:email}).lean();
  
    if (!existingUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User with this email does not exist!',);
    }
  
    if (existingUser?.isVerified) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User is already verified!');
    }
  
    // Generate OTP and prepare email
    const otp = generateOTP();
    const emailValues = {
        name: existingUser.firstName,
        otp,
        email: existingUser.email,
    };

    const accountEmailTemplate = emailTemplate.createAccount(emailValues);
    emailHelper.sendEmail(accountEmailTemplate);
  
    // Update user with authentication details
    const authentication = {
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60000),
    };
  
    await User.findOneAndUpdate(
        { email: email },
        { $set: { authentication } },
        { new: true }
    );
  
    
};

// social authentication
// const socialLoginFromDB = async (payload: IUser) => {

//     const { appId, role } = payload;

//     const isExistUser = await User.findOne({ appId });

//     if (isExistUser) {

//         //create token
//         const accessToken = jwtHelper.createToken(
//             { id: isExistUser._id, role: isExistUser.role },
//             config.jwt.jwt_secret as Secret,
//             config.jwt.jwt_expire_in as string
//         );

//         //create token
//         const refreshToken = jwtHelper.createToken(
//             { id: isExistUser._id, role: isExistUser.role },
//             config.jwt.jwtRefreshSecret as Secret,
//             config.jwt.jwtRefreshExpiresIn as string
//         );

//         return { accessToken, refreshToken };

//     } else {

//         const user = await User.create({ appId, role, verified: true });
//         if (!user) {
//             throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to created User")
//         }

//         //create token
//         const accessToken = jwtHelper.createToken(
//             { id: user._id, role: user.role },
//             config.jwt.jwt_secret as Secret,
//             config.jwt.jwt_expire_in as string
//         );

//         //create token
//         const refreshToken = jwtHelper.createToken(
//             { id: user._id, role: user.role },
//             config.jwt.jwtRefreshSecret as Secret,
//             config.jwt.jwtRefreshExpiresIn as string
//         );

//         return { accessToken, refreshToken };
//     }
// }

// delete user
// delete user
const deleteUserFromDB = async (user: JwtPayload, password: string) => {

    const isExistUser = await User.findById(user.id).select('+password');
    if (!isExistUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }

    //check match password
    if (password && !(await User.isMatchPassword(password, isExistUser.password))) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
    }

    const updateUser = await User.findByIdAndDelete(user.id);
    if (!updateUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    return;
};

export const AuthService = {
    verifyEmailToDB,
    loginUserFromDB,
    forgetPasswordToDB,
    resetPasswordToDB,
    changePasswordToDB,
    newAccessTokenToUser,
    resendVerificationEmailToDB,
    // socialLoginFromDB,
    deleteUserFromDB
};