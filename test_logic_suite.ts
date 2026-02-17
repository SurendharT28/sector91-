
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runGenerativeTest() {
    console.log("=== STARTING LOGIC TEST SUITE ===");
    const timestamp = Date.now();
    let investorId = '';

    // 1. Create Investor
    console.log("\n[1] Creating Investor...");
    const { data: inv, error: invErr } = await supabase.from('investors').insert({
        full_name: `Automated Test ${timestamp}`,
        email: `test.${timestamp}@example.com`,
        phone: '9999999999',
        joining_date: new Date().toISOString().split('T')[0]
    }).select().single();

    if (invErr) { console.error("FAILED to create investor:", invErr); return; }
    investorId = inv.id;
    console.log("SUCCESS. Investor ID:", investorId, "Client ID:", inv.client_id);

    // 2. Add Investment
    console.log("\n[2] Adding Investment (100,000)...");
    const { error: investErr } = await supabase.from('investments').insert({
        investor_id: investorId,
        amount: 100000,
        invested_date: new Date().toISOString().split('T')[0]
    });
    if (investErr) console.error("FAILED to add investment:", investErr);
    else console.log("SUCCESS. Investment added.");

    // 3. Verify Investment Sum Trigger (if exists) or Manual Logic
    const { data: updatedInv } = await supabase.from('investors').select('investment_amount').eq('id', investorId).single();
    if (updatedInv) console.log("Investor Total Investment Amount:", updatedInv.investment_amount);

    // 4. Cleanup
    console.log("\n[4] Cleaning Up...");
    const { error: delErr } = await supabase.from('investors').delete().eq('id', investorId);
    if (delErr) console.error("FAILED to delete investor:", delErr);
    else console.log("SUCCESS. Cleanup complete.");

    console.log("=== TEST SUITE COMPLETE ===");
}

runGenerativeTest();
