import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });
export default {
  ip_address: process.env.IP_ADDRESS,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  node_env: process.env.NODE_ENV,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt: {
    jwt_secret: process.env.JWT_SECRET || "jwt_secret",
    jwt_expire_in: process.env.JWT_EXPIRE_IN || "1d",
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  server: {
    name: process.env.SERVER_NAME || "ENG Backend",
  },
  stripe: {
    stripeSecretKey: process.env.STRIPE_API_SECRET,
    webhookSecret: process.env.WEBHOOK_SECRET,
    backendURL: process.env.BACKEND_URL,
  },
  email: {
    apiKey: process.env.API_KEY,
    emailHeader: process.env.EMAIL_HEADER_NAME,
    from: process.env.EMAIL_FROM,
  },
  social: {
    google_client_id: process.env.GOOGLE_CLIENT_ID,
    facebook_client_id: process.env.FACEBOOK_CLIENT_ID,
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
    facebook_client_secret: process.env.FACEBOOK_CLIENT_SECRET,
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    twilioNumber: process.env.TWILIO_NUMBER,
  },
  veevoTech: {
    apiKey: process.env.VEEVOTECH_API_KEY,
    senderId: process.env.VEEVOTECH_SENDER_ID,
  },
  m3Sms: {
    userId: process.env.M3_SMS_USER_ID,
    password: process.env.M3_SMS_PASSWORD,
    header: process.env.M3_SMS_HEADER,
    url: process.env.M3_SMS_URL,
  },
  frontendUrl: process.env.FRONTEND_URL,
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    db: process.env.REDIS_DB || 0,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },
  allowed_origins: process.env.ALLOWED_ORIGINS,
};
