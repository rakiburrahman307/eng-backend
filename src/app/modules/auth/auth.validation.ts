import { z } from 'zod';

const createVerifyEmailZodSchema = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' }).email({ message: 'Invalid email address' }),
        oneTimeCode: z.number({ required_error: 'One time code is required' })
    })
});

const createLoginZodSchema = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' }).email({ message: 'Invalid email address' }),
        password: z.string({ required_error: 'Password is required' })
    })
});
  
const createForgetPasswordZodSchema = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' }).email({ message: 'Invalid email address' }),
    })
});
  
const createResetPasswordZodSchema = z.object({
    body: z.object({
        newPassword: z.string({ required_error: 'Password is required' }),
        confirmPassword: z.string({
            required_error: 'Confirm Password is required',
        })
    })
});
  
const createChangePasswordZodSchema = z.object({
    body: z.object({
        currentPassword: z.string({
            required_error: 'Current Password is required',
        }),
        newPassword: z.string({ required_error: 'New Password is required' }),
        confirmPassword: z.string({
            required_error: 'Confirm Password is required',
        })
    })
});

export const AuthValidation = {
    createVerifyEmailZodSchema,
    createForgetPasswordZodSchema,
    createLoginZodSchema,
    createResetPasswordZodSchema,
    createChangePasswordZodSchema,
};