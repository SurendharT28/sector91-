

# Database Setup and Frontend Integration Plan

## Overview
Create all database tables in Lovable Cloud and replace the mock data throughout the frontend with real database queries using React Query and the database client.

---

## Phase 1: Database Tables

Create 5 tables matching the existing TypeScript types:

### `investors`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| client_id | text (unique) | Format: S91-INV-XXX |
| full_name | text | required |
| email | text | |
| phone | text | |
| address | text | |
| investment_amount | numeric | default 0 |
| promised_return | numeric | default 0 |
| joining_date | date | |
| status | text | default 'active' |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto |

### `trading_accounts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| name | text | required |
| broker | text | |
| capital_allocated | numeric | default 0 |
| status | text | default 'active' |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto |

### `daily_pnl`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| account_id | uuid (FK) | references trading_accounts |
| date | date | required |
| index_name | text | NIFTY/BANKNIFTY/OTHER |
| pnl_amount | numeric | default 0 |
| capital_used | numeric | default 0 |
| notes | text | |
| pnl_percent | numeric | auto-calculated via trigger |
| created_at | timestamptz | auto |

### `agreements`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| investor_id | uuid (FK) | references investors |
| file_name | text | |
| file_path | text | storage path |
| version | integer | default 1 |
| uploaded_at | timestamptz | auto |

### `audit_logs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| timestamp | timestamptz | auto |
| action | text | |
| reference_id | text | |
| module | text | |
| notes | text | |

### `monthly_returns`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| investor_id | uuid (FK) | references investors |
| month | text | e.g. "Jan 2025" |
| amount | numeric | default 0 |
| status | text | default 'pending' |
| created_at | timestamptz | auto |

### Database helpers
- A trigger on `investors` to auto-generate `client_id` as `S91-INV-XXX` based on row count.
- A trigger on `daily_pnl` to auto-calculate `pnl_percent` from `pnl_amount / capital_used * 100`.
- A trigger on `investors` to auto-update `updated_at` on row changes.
- RLS will be **disabled** since this is a single-user personal app with no authentication.
- Seed the database with the existing mock data so the app works immediately.

---

## Phase 2: Storage Bucket

Create an `agreements` storage bucket for PDF uploads (used by the Agreements page).

---

## Phase 3: Data Access Layer

Create hook files for each module to replace mock data:

### `src/hooks/useInvestors.ts`
- `useInvestors()` -- fetch all investors
- `useCreateInvestor()` -- insert + auto client_id
- `useUpdateInvestor()` -- update by id
- `useDeleteInvestor()` -- delete by id

### `src/hooks/useTrading.ts`
- `useTradingAccounts()` -- fetch accounts
- `useCreateAccount()` -- insert account
- `useDailyPnL(accountId?)` -- fetch P&L entries
- `useCreatePnLEntry()` -- insert P&L
- `useTradingStats()` -- derived stats (net profit, win rate, etc.)

### `src/hooks/useAgreements.ts`
- `useAgreements()` -- fetch all with investor name join
- `useUploadAgreement()` -- upload file to storage + insert record

### `src/hooks/useReturns.ts`
- `useMonthlyReturns()` -- fetch with investor join
- `useCreateReturn()` -- insert return record
- `useUpdateReturnStatus()` -- mark as paid/generated

### `src/hooks/useAuditLog.ts`
- `useAuditLog()` -- fetch all, sorted by timestamp desc
- `useLogAction()` -- insert audit entry (called by other mutations)

### `src/hooks/useDashboardStats.ts`
- Aggregates data from investors, daily_pnl, and monthly_returns tables to compute the dashboard metrics (total investors, capital, net profit, win rate, etc.)

All hooks use **React Query** (`@tanstack/react-query`) for caching, loading states, and automatic refetch on mutations.

---

## Phase 4: Update All Pages

### Dashboard (`Dashboard.tsx`)
- Replace `mockStats` and `mockEquityCurve` with `useDashboardStats()` hook
- Replace `mockAudit` with `useAuditLog()` (limit 5)
- Add loading skeleton states

### Investors (`Investors.tsx`)
- Replace `mockInvestors` with `useInvestors()` 
- Wire "Add Investor" form to `useCreateInvestor()` mutation with toast notifications
- Add form validation and dialog close on success

### Trading (`Trading.tsx`)
- Replace `mockAccounts`, `mockPnL`, `mockEquityCurve` with real hooks
- Wire "Add Account" and "Add P&L Entry" forms to mutations
- Analytics tab computes stats from real P&L data

### Agreements (`Agreements.tsx`)
- Replace inline mock with `useAgreements()`
- Wire "Upload Agreement" button to file picker + `useUploadAgreement()`

### Returns (`Returns.tsx`)
- Replace inline mock with `useMonthlyReturns()`
- Add status update buttons (mark as paid)

### AuditLog (`AuditLog.tsx`)
- Replace `mockAudit` with `useAuditLog()`
- Keep search/filter on the client side

---

## Phase 5: Audit Trail Integration

Every create/update mutation will also call `useLogAction()` to insert an audit entry, e.g.:
- "Created Investor" when adding an investor
- "Added Daily P&L" when logging a trade
- "Uploaded Agreement" when uploading a file

---

## Summary of files to create/modify

**New files:**
- `src/hooks/useInvestors.ts`
- `src/hooks/useTrading.ts`
- `src/hooks/useAgreements.ts`
- `src/hooks/useReturns.ts`
- `src/hooks/useAuditLog.ts`
- `src/hooks/useDashboardStats.ts`

**Modified files:**
- `src/pages/Dashboard.tsx` -- use real data hooks
- `src/pages/Investors.tsx` -- use real data + working forms
- `src/pages/Trading.tsx` -- use real data + working forms
- `src/pages/Agreements.tsx` -- use real data + file upload
- `src/pages/Returns.tsx` -- use real data + status updates
- `src/pages/AuditLog.tsx` -- use real data

**Untouched:** `src/data/mockData.ts` will remain as a fallback reference but will no longer be imported by pages.

