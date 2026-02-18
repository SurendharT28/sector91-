import { z } from "zod";

export const tradingAccountSchema = z.object({
    name: z
        .string()
        .min(3, "Account name must be at least 3 characters")
        .max(50, "Account name too long"),
    broker: z.string().optional(),
    capital_allocated: z.coerce
        .number({ invalid_type_error: "Capital must be a number" })
        .min(0, "Capital cannot be negative")
        .max(10000000000, "Capital exceeds system limit")
        .optional(),
    status: z.string().optional(),
});

export type TradingAccountFormValues = z.infer<typeof tradingAccountSchema>;

export const pnlSchema = z.object({
    account_id: z.string().uuid("Invalid Account ID"),
    date: z.date({ required_error: "Date is required" }),
    index_name: z.string().min(1, "Index is required"),
    custom_index: z.string().optional(),
    pnl_amount: z.coerce
        .number({ invalid_type_error: "P&L Amount must be a number" })
        // P&L can be negative, so no min(0) check
        .max(1000000000, "P&L amount seems unrealistically high (Check for typos)")
        .min(-1000000000, "P&L loss seems unrealistically high"),
    capital_used: z.coerce
        .number({ invalid_type_error: "Capital used must be a number" })
        .min(0, "Capital used cannot be negative")
        .max(10000000000, "Capital used exceeds limit"),
    notes: z.string().optional(),
    setup_used: z.string().optional(),
});

export type PnLFormValues = z.infer<typeof pnlSchema>;
