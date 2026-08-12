import { z } from 'zod';

const normalizeUserType = (val: any) => {
    if (!val || typeof val !== 'string') return 'Player';
    const clean = val.trim().toUpperCase().replace(/[\s_-]+/g, '_');
    if (clean === 'PLAYER') return 'Player';
    if (clean === 'MANAGER') return 'Manager';
    if (clean === 'REFEREE') return 'Referee';
    if (clean === 'CLUB' || clean === 'OTHER_CLUBS' || clean === 'OTHER_CLUB' || clean === 'OTHERCLUBS') return 'Club';
    if (clean === 'TOURNAMENT_PLAYER' || clean === 'TOURNAMENTPLAYER') return 'Tournament Player';
    if (clean === 'TRIAL_PLAYER' || clean === 'TRIALPLAYER') return 'Trial Player';
    if (clean === 'OTHER') return 'Other';
    return val.trim();
};

const normalizeDuration = (val: any) => {
    if (!val || typeof val !== 'string') return '1 month';
    const lower = val.trim().toLowerCase();
    if (lower.includes('year') || lower.includes('12') || lower === 'annual' || lower === 'yearly') return '1 year';
    if (lower.includes('6')) return '6 months';
    if (lower.includes('3')) return '3 months';
    return '1 month';
};

const parseBoolean = (val: any) => {
    if (typeof val === 'boolean') return val;
    if (val === 'true' || val === 1 || val === '1') return true;
    if (val === 'false' || val === 0 || val === '0') return false;
    return val;
};

const parseFeatures = (val: any) => {
    if (!val) return [];
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
                return parsed.map((item: any) =>
                    typeof item === 'string'
                        ? { title: item, isIncluded: true }
                        : { title: item?.title || '', isIncluded: item?.isIncluded !== false }
                );
            }
        } catch {
            return [{ title: val, isIncluded: true }];
        }
    }
    if (Array.isArray(val)) {
        return val.map((item: any) =>
            typeof item === 'string'
                ? { title: item, isIncluded: true }
                : { title: item?.title || '', isIncluded: item?.isIncluded !== false }
        );
    }
    return [];
};

const createPackageZodSchema = z.object({
    body: z.object({
        title: z.string({ error: "Title is required" }).min(1, "Title cannot be empty"),
        description: z.string({ error: "Description is required" }).min(1, "Description cannot be empty"),
        price: z
            .union([z.string(), z.number()])
            .transform((val) => (typeof val === "string" ? parseFloat(val) : Number(val)))
            .refine((val) => !isNaN(val) && val >= 0, { message: "Price must be a valid positive number." }),
        duration: z
            .string({ error: "Duration is required" })
            .transform(normalizeDuration),
        userType: z
            .string()
            .optional()
            .transform(normalizeUserType)
            .default('Player'),
        packageType: z
            .string()
            .optional()
            .transform((val) => {
                if (!val) return 'Professional';
                const v = val.trim().toLowerCase();
                if (v.includes('semi')) return 'Semi Pro';
                if (v.includes('pro')) return 'Professional';
                if (v.includes('tournament')) return 'Tournament Player';
                if (v.includes('trial')) return 'Trial Player';
                return val;
            })
            .default('Professional'),
        paymentType: z
            .string()
            .optional()
            .transform((val) => {
                if (!val) return undefined;
                return val.trim().toLowerCase().includes('year') ? 'Yearly' : 'Monthly';
            }),
        canViewOtherPlayers: z.preprocess(parseBoolean, z.boolean().optional()).default(true),
        canRedeemPoints: z.preprocess(parseBoolean, z.boolean().optional()).default(true),
        canViewOtherPlayerStats: z.preprocess(parseBoolean, z.boolean().optional()).default(true),
        canEarnPoints: z.preprocess(parseBoolean, z.boolean().optional()).default(true),
        features: z
            .preprocess(parseFeatures, z.array(
                z.object({
                    title: z.string().default(''),
                    isIncluded: z.boolean().default(true),
                })
            ))
            .optional()
            .default([]),
        credit: z
            .union([z.string(), z.number()])
            .optional()
            .transform((val) => {
                if (val === undefined || val === null || val === '') return 0;
                const num = typeof val === "string" ? parseFloat(val) : Number(val);
                return isNaN(num) ? 0 : num;
            })
            .default(0),
    })
});

export const PackageValidation = {
    createPackageZodSchema,
};
