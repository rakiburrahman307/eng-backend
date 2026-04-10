import { NextFunction, Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ReportService } from "./report.service";
import sendResponse from "../../../shared/sendResponse";

const createReport = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = {
        barber: req.user.id,
        ...req.body
    };
    const result = await ReportService.createReportToDB(payload);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Report Created Successfully",
        data: result,
    });
})

export const ReportController = {
    createReport
}