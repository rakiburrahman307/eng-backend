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
     const query = req.query;
     const result = await ServerHealthServices.getServerLogsFromDB(query);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Server Logs Retrieved Successfully',
          data: result,
     });
});
export const ServerHealthControllers = {
     serverHealth,
     getServerLogs,
};
