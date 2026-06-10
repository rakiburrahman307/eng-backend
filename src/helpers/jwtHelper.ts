import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';

const createToken = (
  payload: object,
  secret: Secret,
  expireTime: string
) => {
  // 🔥 safety check
  if (!secret) {
    throw new Error('❌ JWT secret is missing');
  }

  if (!expireTime) {
    throw new Error('❌ JWT expire time is missing');
  }



  const token = jwt.sign(payload, secret, {
    expiresIn: expireTime as any,
  });

  return token;
};

const verifyToken = (token: string, secret: Secret) => {
  // 🔥 safety check
  if (!secret) {
    throw new Error('❌ JWT secret is missing for verification');
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('❌ JWT Verification Failed:', error);
    throw error;
  }
};

export const jwtHelper = { createToken, verifyToken };