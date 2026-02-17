
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkLogin() {
    const email = "recovery_admin@sector91.com";
    const password = "SECTOR91";

    console.log(`Attempting login for ${email}...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Login Failed:", error.message);
        if (error.message.includes("Email not confirmed")) {
            console.log("Status: Unconfirmed");
        }
    } else {
        console.log("Login Success!");
        console.log("Session User:", data.user?.email);
    }
}

checkLogin();
