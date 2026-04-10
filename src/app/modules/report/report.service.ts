import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IReport } from "./report.interface";
import { Report } from "./report.model";

const createReportToDB = async (payload: IReport): Promise<IReport> => {
    const report = await Report.create(payload);
    if (!report) throw new ApiError( StatusCodes.BAD_REQUEST, 'Failed to created Report ');
    return report;
}

export const ReportService = {
    createReportToDB
}