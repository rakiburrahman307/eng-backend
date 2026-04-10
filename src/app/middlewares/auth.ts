import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import { jwtHelper } from '../../helpers/jwtHelper';
import ApiError from '../../errors/ApiErrors';

const auth = (...roles: string[]) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("🔥 AUTH MIDDLEWARE HIT");
    console.log("📦 authHeader:", authHeader);

    if (!authHeader) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }

    // ✅ Accept BOTH Bearer & raw token
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    if (!token) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token not found');
    }

    // verify token
    const decoded = jwtHelper.verifyToken(
      token,
      config.jwt.jwt_secret as Secret
    );

    if (!decoded) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token');
    }

    // ✅ IMPORTANT: normalize user object
    req.user = {
      _id: decoded._id || decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    console.log("✅ USER ATTACHED:", req.user);

    // role check
    if (roles.length && !roles.includes(req.user.role)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You don't have permission to access this api"
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default auth;