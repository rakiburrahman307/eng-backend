import rateLimit from 'express-rate-limit';

// Global API rate limiter: 2000 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests, please try again in a moment.',
  },
});

// Image / static files rate limiter: 3000 requests per minute per IP
export const imageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many image requests, please try again later.',
  },
});
