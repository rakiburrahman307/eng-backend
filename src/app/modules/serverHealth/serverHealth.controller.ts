import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ServerHealthServices } from './serverHealth.service';

const serverHealth = catchAsync(async (req, res) => {
     const result = await ServerHealthServices.serverHealth();
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Server Health Fetched Successfully',
          data: result,
     });
});

const getServerLogs = catchAsync(async (req, res) => {
     const type = (req.query.type as 'success' | 'error') || 'success';
     const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
     const result = await ServerHealthServices.getServerLogs(type, limit);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Server Logs Fetched Successfully',
          data: result,
     });
});

const getQueueAndCacheStatus = catchAsync(async (req, res) => {
     const result = await ServerHealthServices.getQueueAndCacheStatus();
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Queue and Cache Status Fetched Successfully',
          data: result,
     });
});

const executeQueueAction = catchAsync(async (req, res) => {
     const { queueName, action } = req.body;
     const result = await ServerHealthServices.executeQueueAction(queueName, action);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: result,
     });
});

const flushCache = catchAsync(async (req, res) => {
     const { type = 'cache-only' } = req.body;
     const result = await ServerHealthServices.flushCache(type);
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: result,
     });
});

export const ServerHealthControllers = {
     serverHealth,
     getServerLogs,
     getQueueAndCacheStatus,
     executeQueueAction,
     flushCache,
};
