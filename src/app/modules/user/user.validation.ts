import { z } from 'zod';

const createAdminZodSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    role: z.string().min(1, "Role is required"),
  }),
});
const createUserZodSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    phone: z.string().optional(),
    phoneNumber: z.string().optional(),
    role: z.string().optional(),
  }),
});

const createPlayerZodSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dateOfBirth: z.string().optional(),
    ageGroup: z.string().optional(),
    previousClub: z.string().optional(),
    position: z.string().optional(),
    strongFoot: z.string().optional(),
    profile: z.string().optional(),
    document: z.union([z.string(), z.array(z.string())]).optional(),
    selectTeam: z.string().optional(),
    isDevelopmentPlayer: z.union([z.boolean(), z.string()]).optional(),
    mediaConsent: z.union([z.boolean(), z.string()]).optional(),
    playForAcademy: z.union([z.boolean(), z.string()]).optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    phoneNumber: z.string().optional(),
    emergencyEmail: z.string().optional(),
    emergencyPhone: z.string().optional(),
    data: z.any().optional(),
  }),
});

export const UserValidation = {
  createAdminZodSchema,
  createUserZodSchema,
  createPlayerZodSchema,
};  