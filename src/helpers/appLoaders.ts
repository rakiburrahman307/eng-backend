import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import { StatusCodes } from 'http-status-codes';
import { Morgan } from '../shared/morgan';
import config from '../config';
import handleStripeWebhook from './handleStripeWebhook';
import router from '../app/routes';
import { globalLimiter, imageLimiter } from '../app/middlewares/rateLimiter';
import globalErrorHandler from '../app/middlewares/globalErrorHandler';
import { welcome } from '../util/welcome';
export const allowedOrigins =
     config.allowed_origins?.split(',').map((origin: string) => origin.trim()) || [];
export function configureMiddlewares(app: Express): void {
     app.post(
          '/api/v1/payment/webhook',
          express.raw({ type: 'application/json' }),
          handleStripeWebhook
     );

     app.use(Morgan.successHandler);
     app.use(Morgan.errorHandler);

     app.use(
          cors({
               origin: (origin, callback) => {
                    // Allow requests with no origin (like mobile apps, curl, postman)
                    if (!origin) return callback(null, true);

                    // In development, reflect request origin to bypass wildcard restriction with credentials
                    if (config.node_env !== 'production') {
                         return callback(null, true);
                    }

                    // In production, check if the origin is in the allowed list
                    if (allowedOrigins.includes(origin)) {
                         return callback(null, true);
                    } else {
                         return callback(new Error('Not allowed by CORS'));
                    }
               },
               credentials: true,
          })
     );
     app.use(express.json({ limit: '50mb' }));
     app.use(express.urlencoded({ extended: true, limit: '50mb' }));

     app.use('/images', imageLimiter);
     app.use(express.static('uploads'));

     app.use(
          session({
               secret: process.env.SESSION_SECRET || config.jwt.jwt_secret || 'your_secret_key',
               resave: false,
               saveUninitialized: true,
               cookie: { secure: config.node_env === 'production' },
          })
     );
}

export function configureRoutes(app: Express): void {
     // Main API v1 routing under global rate limits
     app.use('/api/v1', globalLimiter, router);

     app.get('/', (req: Request, res: Response) => {
          res.send(welcome());
     });
}

export function configureErrorHandlers(app: Express): void {
     app.use(globalErrorHandler);
     app.use((req: Request, res: Response) => {
          res.status(StatusCodes.NOT_FOUND).json({
               success: false,
               message: 'Not Found',
               errorMessages: [
                    {
                         path: req.originalUrl,
                         message: "API DOESN'T EXIST",
                    },
               ],
          });
     });
}
