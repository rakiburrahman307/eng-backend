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

//login
const loginUserFromDB = async (payload: ILoginData) => {

    const { email, password } = payload;
    const isExistUser:any = await User.findOne({ email }).select('+password');
    if (!isExistUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
  
    //check verified and status
    if (!isExistUser.verified) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Please verify your account, then try to login again');
    }
  
    //check match password
    if ( password && !(await User.isMatchPassword(password, isExistUser.password))) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');
    }
  
    //create token
    const accessToken = jwtHelper.createToken(
        { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
        config.jwt.jwt_secret as Secret,
        config.jwt.jwt_expire_in as string
    );

    //create token
    const refreshToken = jwtHelper.createToken(
        { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
        config.jwt.jwtRefreshSecret as Secret,
        config.jwt.jwtRefreshExpiresIn as string
    );

    return { accessToken, refreshToken };
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
        throw new ApiError( StatusCodes.BAD_REQUEST, 'Please give the otp, check your email we send a code');
    }
  
    if (isExistUser.authentication?.oneTimeCode !== oneTimeCode) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'You provided wrong otp');
    }
  
    const date = new Date();
    if (date > isExistUser.authentication?.expireAt) {
        throw new ApiError( StatusCodes.BAD_REQUEST, 'Otp already expired, Please try again');
    }
  
    let message;
    let data;
  
    if (!isExistUser.verified) {
        await User.findOneAndUpdate(
            { _id: isExistUser._id },
            { verified: true, authentication: { oneTimeCode: null, expireAt: null } }
        );
        message = 'Email verify successfully';
    } else {
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
  
        //create token ;
        const createToken = cryptoToken();
        await ResetToken.create({
            user: isExistUser._id,
            token: createToken,
            expireAt: new Date(Date.now() + 5 * 60000),
        });
        message = 'Verification Successful: Please securely store and utilize this code for reset password';
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
    const isExistUser = await User.findById(user.id).select('+password');
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

    await User.findOneAndUpdate({ _id: user.id }, updateData, { new: true });
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