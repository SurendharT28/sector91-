
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAuthCRUD() {
    console.log("=== Testing Authenticated CRUD ===");
    const randomEmail = `testuser_${Date.now()}@example.com`;
    const password = "TestUser123!";

    // 1. Sign Up
    console.log(`[1] Signing Up as ${randomEmail}...`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: randomEmail,
        password: password
    });

    if (authError) {
        console.error("SignUp Failed:", authError.message);
        // Try sign in if user exists (unlikely with timestamp)
        return;
    }

    // Even if auto-confirm is off, we might get a session if it's disabled email confirm
    // Or we need to signIn.
    // Let's assume development mode allows sign in or returns session.
    let session = authData.session;

    if (!session) {
        console.log("No session returned. Trying SignIn...");
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: randomEmail,
            password: password
        });
        if (signInError) {
            console.error("SignIn Failed:", signInError.message);
            return;
        }
        session = signInData.session;
    }

    if (!session) {
        console.error("could not get session.");
        return;
    }

    console.log("✅ Authenticated.");

    // 2. Perform Insert (Should Succeed)
    console.log("[2] Attempting Insert (Expenses)...");
    const { data: exp, error: expError } = await supabase.from('expenses').insert({
        amount: 500,
        notes: 'Auth Test Expense'
    }).select();

    if (expError) {
        console.error("❌ Insert Failed (Unexpected for Auth User):", expError.message);
    } else {
        console.log("✅ Insert Succeeded (Expected). ID:", exp?.[0]?.id || "Created");
    }

    // 3. Cleanup (Delete User? logic complex via client, maybe delete record)
    // We leave record as test artifact or delete it
    if (exp?.[0]?.id) {
        await supabase.from('expenses').delete().eq('id', exp[0].id);
        console.log("✅ Cleanup (Delete) Succeeded.");
    }
}

testAuthCRUD();
