import { z } from 'zod';

const createPackageZodSchema = z.object({
    body: z.object({
        title: z.string({ error: "Title is required" }),
        description: z.string({ error: "Description is required" }),
        price: z
            .union([z.string(), z.number()])
            .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
            .refine((val) => !isNaN(val), { message: "Price must be a valid number." }),
        duration: z.enum(["1 month", "3 months", "6 months", "1 year"], { error: "Duration is required" }),
        userType: z.enum(['Player', 'Manager', 'Club', 'Referee', 'Other']).optional(),
        packageType: z.enum(['Semi Pro', 'Professional', 'Other']).optional(),
        canViewOtherPlayers: z.boolean().optional(),
        canRedeemPoints: z.boolean().optional(),
        canViewOtherPlayerStats: z.boolean().optional(),
        canEarnPoints: z.boolean().optional(),
        features: z
            .array(
                z.object({
                    title: z.string({ error: "Feature title is required" }),
                    isIncluded: z.boolean().default(true),
                })
            )
            .optional(),
        credit: z
            .union([z.string(), z.number()])
            .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
            .refine((val) => !isNaN(val), { message: "Credit must be a valid number." }),
    })
});

export const PackageValidation = {
    createPackageZodSchema,
};
