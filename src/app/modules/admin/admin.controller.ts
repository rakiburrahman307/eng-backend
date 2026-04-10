import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AdminService } from './admin.service';

const createAdmin = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await AdminService.createAdminToDB(payload);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin created Successfully',
        data: result
    });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
    const payload = req.params.id;
    const result = await AdminService.deleteAdminFromDB(payload);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin Deleted Successfully',
        data: result
    });

});

const getAdmin = catchAsync(async (req: Request, res: Response) => {

    const result = await AdminService.getAdminFromDB();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin Retrieved Successfully',
        data: result
    });

});

export const AdminController = {
    deleteAdmin,
    createAdmin,
    getAdmin
};