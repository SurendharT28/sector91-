
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function provisionAdmin() {
    // FALLBACK EMAIL to bypass rate limit
    const email = "admin@sector91.com";
    const password = "SECTOR91";

    console.log(`Attempting to provision ${email}...`);

    // 1. Try SignUp
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error("SignUp Error:", error.message);
    } else {
        console.log("SignUp Success! User ID:", data.user?.id);
    }
}

provisionAdmin();
