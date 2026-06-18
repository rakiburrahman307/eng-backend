import { z } from 'zod';

const createAdminZodSchema = z.object({
    body: z.object({
        name: z.string().optional().refine((val) => val !== undefined, { message: 'Name is required' }),
        email: z.string().email({ message: 'Invalid email address' }).refine((val) => val !== undefined, { message: 'Email is required' }),
        password: z.string().refine((val) => val !== undefined, { message: 'Password is required' }),
        role: z.string().refine((val) => val !== undefined, { message: 'Role is required' }),
    })
});

export const AdminValidation = {
    createAdminZodSchema,
};
