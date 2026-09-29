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
export const ServerHealthControllers = {
     serverHealth,
};
