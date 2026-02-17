import { toast } from "sonner";

interface SupabaseError {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
}

/**
 * Parses and handles API/Database errors centrally.
 * @param error The error object caught in try/catch or onError callbacks.
 * @param context Optional context message (e.g., "Failed to create investor").
 */
export const handleError = (error: unknown, context: string = "An error occurred") => {
    console.error(`[ErrorHandler] ${context}:`, error);

    // Check if it's a Supabase/Postgres error
    const sbError = error as SupabaseError;
    let userMessage = context;
    let description = "Please try again later.";

    // Known Postgres Error Codes
    // https://www.postgresql.org/docs/current/errcodes-appendix.html
    if (sbError.code) {
        switch (sbError.code) {
            case "23505": // unique_violation
                userMessage = "Duplicate Entry";
                description = "This record already exists. Please check unique fields like Email or ID.";
                break;
            case "23514": // check_violation
                userMessage = "Validation Error";
                description = "The data provided violates a system rule (e.g., negative amount).";
                break;
            case "23503": // foreign_key_violation
                userMessage = "Reference Error";
                description = "This record relies on another record that doesn't exist or was deleted.";
                break;
            case "23502": // not_null_violation
                userMessage = "Missing Information";
                description = "A required field is missing.";
                break;
            case "22003": // numeric_value_out_of_range
                userMessage = "Number Too Large";
                description = "The amount entered exceeds the system limit.";
                break;
            default:
                userMessage = "System Error";
                description = sbError.message || description;
        }
    } else if (error instanceof Error) {
        // Standard JS Error
        description = error.message;
    }

    // Display Toast
    toast.error(userMessage, {
        description: description,
        duration: 5000,
    });
};
