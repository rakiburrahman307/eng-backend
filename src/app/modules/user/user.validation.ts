import { z } from 'zod';

const createAdminZodSchema = z.object({
  body: z.object({
    userName: z.string().min(1, "Name is required"),
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
    userName: z.string().min(1, "Name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    role: z.string().min(1, "Role is required"),
  }),
});

const createPlayerZodSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required"),

    lastName: z.string().min(1, "Last name is required"),

    dateOfBirth: z.string().min(1, "Date of birth is required"),

    ageGroup: z.enum(["U16", "U18", "U21", "SENIOR"]),

    position: z.string().optional(),

    document: z.string().optional(),
  }).refine((data) => {
    return data.ageGroup ;
  }, {
    message: "Age group and Select team are required",
  }),
});

export const UserValidation = {
  createAdminZodSchema,
  createUserZodSchema,
  createPlayerZodSchema,
};  