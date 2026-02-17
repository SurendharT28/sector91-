
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

async function runTestSuite() {
    console.log("=== STARTING COMPREHENSIVE SYSTEM AUDIT ===\n");
    const timestamp = Date.now();
    let investorId = '';
    let accountId = '';
    const results: Record<string, '✅' | '❌' | '⚠️'> = {};

    // --- MODULE 1: INVESTORS ---
    console.log("--- Testing Investor Module ---");
    try {
        const { data: inv, error } = await supabase.from('investors').insert({
            full_name: `QA Test Investor ${timestamp}`,
            email: `qa.${timestamp}@example.com`,
            phone: '9876543210',
            joining_date: new Date().toISOString().split('T')[0]
        }).select().single();

        if (error) throw error;
        investorId = inv.id;
        console.log(`[Create Investor] Success. ID: ${inv.client_id}`);
        results['Investor Creation'] = '✅';

        // Creation Trigger Check
        if (inv.client_id && inv.client_id.startsWith('S91-INV-')) {
            console.log(`[Client ID Trigger] Success. Format: ${inv.client_id}`);
            results['Client ID Generation'] = '✅';
        } else {
            console.error(`[Client ID Trigger] Failed. Got: ${inv.client_id}`);
            results['Client ID Generation'] = '❌';
        }

    } catch (e: any) {
        console.error(`[Investor Module] Failed: ${e.message}`);
        results['Investor Creation'] = '❌';
    }

    // --- MODULE 2: TRADING ACCOUNTS ---
    console.log("\n--- Testing Trading Accounts Module ---");
    try {
        const { data: acc, error } = await supabase.from('trading_accounts').insert({
            name: `QA Account ${timestamp}`,
            broker: 'Zerodha',
            capital_allocated: 500000,
            status: 'active'
        }).select().single();

        if (error) throw error;
        accountId = acc.id;
        console.log(`[Create Account] Success. ID: ${acc.id}`);
        results['Account Creation'] = '✅';

    } catch (e: any) {
        console.error(`[Trading Module] Failed: ${e.message}`);
        results['Account Creation'] = '❌';
    }

    // --- MODULE 3: DAILY P&L ---
    console.log("\n--- Testing Daily P&L Module ---");
    if (accountId) {
        try {
            const capital = 100000;
            const pnl = 5000;
            const { data: pnlEntry, error } = await supabase.from('daily_pnl').insert({
                account_id: accountId,
                date: new Date().toISOString().split('T')[0],
                pnl_amount: pnl,
                capital_used: capital, // implied 5% pnl
                index_name: 'NIFTY'
            }).select().single();

            if (error) throw error;
            console.log(`[Create P&L] Success.`);
            results['P&L Entry'] = '✅';

            // Check P&L Percent Calculation Trigger
            if (pnlEntry.pnl_percent === 5.00) {
                console.log(`[P&L Calculation] Success. Calculated 5.00%`);
                results['P&L Logic'] = '✅';
            } else {
                console.warn(`[P&L Calculation] Partial/Fail. Expected 5.00, Got: ${pnlEntry.pnl_percent}`);
                results['P&L Logic'] = '⚠️';
            }

        } catch (e: any) {
            console.error(`[P&L Module] Failed: ${e.message}`);
            results['P&L Entry'] = '❌';
        }
    } else {
        results['P&L Entry'] = '⚠️'; // Skipped
    }

    // --- MODULE 4: INVESTMENTS & LOGIC ---
    console.log("\n--- Testing Investment Logic ---");
    if (investorId) {
        try {
            const { error } = await supabase.from('investments').insert({
                investor_id: investorId,
                amount: 250000
            });
            if (error) throw error;
            console.log(`[Add Investment] Success.`);
            results['Investment Logic'] = '✅';

            // Verify Auto-Update of Investor Total (The fix we made)
            const { data: updatedInv } = await supabase.from('investors').select('investment_amount').eq('id', investorId).single();
            if (updatedInv && updatedInv.investment_amount === 250000) {
                console.log(`[Investor Total Update] Success. Total is 250000.`);
                results['Investment Total Trigger'] = '✅';
            } else {
                console.error(`[Investor Total Update] Failed. Expected 250000, Got: ${updatedInv?.investment_amount}`);
                results['Investment Total Trigger'] = '❌';
            }

        } catch (e: any) {
            console.error(`[Investment Logic] Failed: ${e.message}`);
            results['Investment Logic'] = '❌';
        }
    }

    // --- MODULE 5: EXPENSES ---
    console.log("\n--- Testing Expenses Module ---");
    try {
        const { error } = await supabase.from('expenses').insert({
            amount: 1500,
            notes: 'QA Test Expense'
        });
        if (error) throw error;
        console.log(`[Create Expense] Success.`);
        results['Expense Creation'] = '✅';
    } catch (e: any) {
        console.error(`[Expense Module] Failed: ${e.message}`);
        results['Expense Creation'] = '❌';
    }

    // --- CLEANUP ---
    console.log("\n--- CLEANUP PHASE ---");
    if (investorId) await supabase.from('investors').delete().eq('id', investorId);
    if (accountId) await supabase.from('trading_accounts').delete().eq('id', accountId);
    console.log("Cleanup complete.");

    // --- SUMMARY ---
    console.log("\n=== AUDIT SUMMARY ===");
    console.table(results);
}

runTestSuite();
