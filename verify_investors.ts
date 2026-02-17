
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from the current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase URL or Key');
    console.log('URL:', SUPABASE_URL);
    console.log('KEY:', SUPABASE_KEY ? '******' : 'Missing');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listInvestors() {
    console.log("Checking Project:", SUPABASE_URL);
    const { data: investors, error } = await supabase
        .from("investors")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching investors:", error);
    } else {
        console.log("Investors found in DB:");
        if (investors.length === 0) {
            console.log("0 investors found.");
        } else {
            console.table(investors.map(i => ({
                id: i.id,
                name: i.full_name,
                client_id: i.client_id,
                created_at: i.created_at
            })));
        }
    }
}

listInvestors();
