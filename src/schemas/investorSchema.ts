import { z } from "zod";

export const investorSchema = z.object({
    full_name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be less than 100 characters")
        .regex(/^[a-zA-Z\s\.]+$/, "Name can only contain letters, spaces, and dots"),
    email: z
        .string()
        .email("Invalid email address")
        .optional()
        .or(z.literal("")),
    phone: z
        .string()
        .regex(/^\+?[0-9]{10,15}$/, "Phone number must be 10-15 digits")
        .optional()
        .or(z.literal("")),
    address: z
        .string()
        .max(200, "Address is too long")
        .optional()
        .or(z.literal("")),
});

export type InvestorFormValues = z.infer<typeof investorSchema>;

export const waitingPeriodSchema = z.object({
    amount: z.coerce
        .number({ invalid_type_error: "Amount must be a number" })
        .min(0, "Amount cannot be negative")
        .max(10000000000, "Amount exceeds system limit"),
});

export type WaitingPeriodFormValues = z.infer<typeof waitingPeriodSchema>;
