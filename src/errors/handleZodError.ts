import mongoose from 'mongoose';
import { IErrorMessage } from '../types/errors.types';

const handleValidationError = (error: mongoose.Error.ValidationError) => {
    const errorMessages: IErrorMessage[] = [];

    if (error?.errors && typeof error.errors === 'object') {
        Object.values(error.errors).forEach((el) => {
            errorMessages.push({
                path: el?.path || '',
                message: el?.message || 'Validation error',
            });
        });
    }

    return {
        statusCode: 400,
        message: 'Validation Error',
        errorMessages,
    };
};

export default handleValidationError;