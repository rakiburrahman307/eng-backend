import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

export const maintenanceMiddleware = (
     req: Request,
     res: Response,
     next: NextFunction
): void => {
     // Check if maintenance mode is enabled
     const isMaintenanceActive =
          process.env.MAINTENANCE_MODE === 'true' ||
          process.env.MAINTENANCE_MODE === '1';

     if (!isMaintenanceActive) {
          return next();
     }

     // Always bypass Stripe webhooks & payment redirect views
     if (
          req.path.includes('/payment/webhook') ||
          req.path.includes('/payment/success') ||
          req.path.includes('/payment/cancel')
     ) {
          return next();
     }

     // Optional Secret Bypass Header (e.g. for developer / API testing)
     const bypassKey = req.headers['x-maintenance-bypass'] || req.headers['x-bypass-key'];
     if (
          bypassKey &&
          process.env.MAINTENANCE_BYPASS_KEY &&
          bypassKey === process.env.MAINTENANCE_BYPASS_KEY
     ) {
          return next();
     }

     // Extract client IP (supporting Nginx reverse proxy, Cloudflare, and direct socket)
     const forwardedFor = (req.headers['x-forwarded-for'] as string) || '';
     const realIp = (req.headers['x-real-ip'] as string) || '';
     const cfConnectingIp = (req.headers['cf-connecting-ip'] as string) || '';
     const socketIp = req.socket?.remoteAddress || '';
     const expressIp = req.ip || '';

     const clientIps = [
          ...forwardedFor.split(',').map((ip) => ip.trim()),
          realIp.trim(),
          cfConnectingIp.trim(),
          socketIp.trim(),
          expressIp.trim(),
     ]
          .filter(Boolean)
          .map((ip) => ip.replace(/^::ffff:/, '')); // normalize IPv6-mapped IPv4

     // Allowed IPs from environment variable
     const rawAllowedIps = process.env.ALLOWED_MAINTENANCE_IPS || '';
     const allowedIps = [
          '127.0.0.1',
          '::1',
          'localhost',
          ...rawAllowedIps.split(',').map((ip) => ip.trim()),
     ]
          .filter(Boolean)
          .map((ip) => ip.replace(/^::ffff:/, ''));

     // Check if any extracted client IP matches the allowed list
     const isIpAllowed = clientIps.some((clientIp) =>
          allowedIps.some(
               (allowed) =>
                    allowed === clientIp ||
                    (allowed.endsWith('*') && clientIp.startsWith(allowed.replace('*', '')))
          )
     );

     if (isIpAllowed) {
          return next();
     }

     // Return 503 Maintenance Response
     res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
          success: false,
          statusCode: StatusCodes.SERVICE_UNAVAILABLE,
          message:
               process.env.MAINTENANCE_MESSAGE ||
               'The server is currently under scheduled maintenance. Please try again shortly.',
          isMaintenance: true,
     });
};
