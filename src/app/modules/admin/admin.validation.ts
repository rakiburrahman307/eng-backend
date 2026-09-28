import { z } from 'zod';

const createAdminZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    userName: z.string().optional(),
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }).optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
    permissions: z.array(z.string()).optional(),
  }),
});

const updateAdminZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    userName: z.string().optional(),
    email: z.string().email({ message: 'Invalid email address' }).optional(),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }).optional(),
    phone: z.string().optional(),
    status: z.string().optional(),
    permissions: z.array(z.string()).optional(),
  }),
});

export const AdminValidation = {
  createAdminZodSchema,
  updateAdminZodSchema,
};
