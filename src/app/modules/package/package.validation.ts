import { z } from 'zod';

const createPackageZodSchema = z.object({
    body: z.object({
        title: z.string({ required_error: "Title is required" }),
        description: z.string({ required_error: "Description is required" }),
        price: z
            .union([z.string(), z.number()])
            .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
            .refine((val) => !isNaN(val), { message: "Price must be a valid number." }),
        duration: z.enum(["1 month", "3 months", "6 months", "1 year"], { required_error: "Duration is required" }),
        credit: z
            .union([z.string(), z.number()])
            .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
            .refine((val) => !isNaN(val), { message: "Credit must be a valid number." }),
    })
});

export const PackageValidation = {
    createPackageZodSchema,
};
