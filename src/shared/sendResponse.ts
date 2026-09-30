import { Response } from 'express';

type IData<T> = {
    success: boolean;
    statusCode: number;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        totalPage: number;
        total: number;
    };
    summary?: any;
    data?: T;
    [key: string]: any;
};

const sendResponse = <T>(res: Response, data: IData<T>) => {
    const resData: Record<string, any> = {
        success: data.success,
        message: data.message,
        pagination: data.pagination,
        data: data.data,
    };
    if (data.summary !== undefined) {
        resData.summary = data.summary;
    }
    res.status(data.statusCode).json(resData);
};

export default sendResponse;
