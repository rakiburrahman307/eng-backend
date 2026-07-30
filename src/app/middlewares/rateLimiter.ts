import rateLimit from 'express-rate-limit';

// Global API rate limiter: 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Image / static files rate limiter: 300 requests per 15 minutes per IP
export const imageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many image requests from this IP, please try again later.',
  },
});
