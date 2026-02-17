
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
    console.log("🚀 Starting Backend QA Tests...\n");
    const results: any[] = [];

    // TEST 1: Constraint Violation (Null Name)
    console.log("TEST 1: Constraint Violation (Null Name)");
    const { error: err1 } = await supabase.from('investors').insert([{ full_name: null }]);
    if (err1) {
        console.log("✅ PASS: Blocked NULL name", err1.message);
        results.push({ test: "Null Name", status: "PASS", message: err1.message });
    } else {
        console.log("❌ FAIL: Allowed NULL name");
        results.push({ test: "Null Name", status: "FAIL" });
    }

    // TEST 2: Foreign Key Violation (Invalid Account ID)
    console.log("\nTEST 2: FK Violation (Invalid Account ID)");
    const { error: err2 } = await supabase.from('daily_pnl').insert([{
        account_id: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
        date: '2024-01-01',
        pnl_amount: 100
    }]);
    if (err2) {
        console.log("✅ PASS: Blocked invalid FK", err2.message);
        results.push({ test: "Invalid FK", status: "PASS", message: err2.message });
    } else {
        console.log("❌ FAIL: Allowed invalid FK");
        results.push({ test: "Invalid FK", status: "FAIL" });
    }

    // TEST 3: SQL Injection Attempt
    console.log("\nTEST 3: SQL Injection Simulation");
    const maliciousName = "TestUser'); DROP TABLE investors; --";
    const { data: data3, error: err3 } = await supabase.from('investors').insert([{ full_name: maliciousName }]).select();
    if (err3) {
        console.log("⚠️ Error inserting SQL injection string (might be standard error):", err3.message);
        results.push({ test: "SQL Injection Insert", status: "ERROR", message: err3.message });
    } else if (data3 && data3[0].full_name === maliciousName) {
        console.log("✅ PASS: SQL Injection string treated as literal value");
        results.push({ test: "SQL Injection Resilience", status: "PASS", notes: "String saved literally" });
        // Cleanup
        await supabase.from('investors').delete().eq('id', data3[0].id);
    } else {
        console.log("❌ FAIL: Unexpected behavior with SQL injection string");
        results.push({ test: "SQL Injection Resilience", status: "FAIL" });
    }

    // TEST 4: Division by Zero Trigger Test
    console.log("\nTEST 4: Division by Zero (Zero Capital P&L)");
    // First create a temp account
    const { data: acc } = await supabase.from('trading_accounts').insert([{ name: 'QA Temp Account' }]).select().single();
    if (acc) {
        const { data: pnl, error: err4 } = await supabase.from('daily_pnl').insert([{
            account_id: acc.id,
            date: '2024-01-01',
            pnl_amount: 1000,
            capital_used: 0 // Should trigger logic
        }]).select().single();

        if (pnl) {
            console.log(`✅ PASS: Handled zero capital. P&L Percent: ${pnl.pnl_percent}%`);
            results.push({ test: "Div by Zero Trigger", status: "PASS", notes: `Calculated: ${pnl.pnl_percent}%` });
        } else {
            console.log("❌ FAIL: Failed to insert zero capital P&L", err4?.message);
            results.push({ test: "Div by Zero Trigger", status: "FAIL", message: err4?.message });
        }

        // Cleanup
        await supabase.from('trading_accounts').delete().eq('id', acc.id);
    } else {
        console.log("⚠️ Skipping Test 4: Could not create temp account");
    }

    // TEST 5: Negative Capital (Backend check?)
    // The DB schema defaults to 0 but doesn't explicitly CHECK >= 0 in the migration I saw. Let's verify.
    console.log("\nTEST 5: Negative Capital Constraint");
    const { error: err5 } = await supabase.from('trading_accounts').insert([{ name: 'Negative Cap', capital_allocated: -5000 }]);
    if (err5) {
        console.log("✅ PASS: Database rejected negative capital", err5.message);
        results.push({ test: "Negative Capital DB Constraint", status: "PASS" });
    } else {
        console.log("⚠️ INFO: Database ALLOWED negative capital (Constraint missing)");
        results.push({ test: "Negative Capital DB Constraint", status: "FAIL", notes: "Constraint missing in DB, relies on Frontend" });
        // Cleanup if it worked
        await supabase.from('trading_accounts').delete().eq('name', 'Negative Cap');
    }

    console.log("\n------------------------------------------------");
    console.log("QA SUMMARY");
    console.table(results);
}

runTests().catch(console.error);
