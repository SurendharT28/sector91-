
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testRLS() {
    console.log("Testing RLS with Anon Key...");
    try {
        const { data, error } = await supabase.from('expenses').insert({
            amount: 100,
            notes: 'RLS Check'
        }).select();

        if (error) {
            console.log("✅ RLS Blocked Insert (Expected):", error.message);
        } else {
            console.error("❌ RLS Failed! Insert Succeeded (Unexpected):", data);
        }
    } catch (e) {
        console.log("✅ RLS Blocked Insert (Caught Error):", e.message);
    }
}

testRLS();
