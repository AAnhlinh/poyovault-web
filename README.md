# PoyoVault

Published link: https://site-74b9de94e75949749f0f1d1bc52c4115.freebuff.page/

Preview link: https://site-5168ecc52e69449db90546e277b5fbd9.freebuff.page/

A premium personal-finance workspace that connects a customer's whole financial life — checking, savings, credit cards, student loans, auto loans and a mortgage — and explains what to do next.

PoyoVault is a working, interactive prototype. Every number is derived from the displayed account and transaction data. There is no random-number generation in any financial calculation.

![PoyoVault](https://img.shields.io/badge/next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![Supabase](https://img.shields.io/badge/Supabase-auth%20%2B%20Postgres-3ECF8E) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38BDF8)

## What is included

| Area | Details |
| --- | --- |
| Home dashboard | Dense portfolio summary (net position, cash, savings, card debt and loans), tabbed account ledger, health score with factor-level explanations, **Poyo's plan** with an explicit do-this-first / hold-off order, cash-flow chart, observations, upcoming payments, goals, transactions and gamification |
| Accounts | Deposits, credit cards and loans grouped by type; simulated read-only connection flow; disconnect with confirmation; limits, rates, due dates, remaining terms |
| Spending | Interactive category donut, monthly bars, category drift vs. a three-month baseline, subscription tracker with cancel/restore, searchable and filterable transaction ledger |
| Debt manager | Debt portfolio, interest cost, weighted APR, avalanche vs. snowball comparison, adjustable extra payment, payoff chart and dates, payoff priority reasoning |
| Savings | Emergency-fund analysis based on essential expenses (not income), target editing, goal contributions that move real balances, savings-rate view, surplus split |
| AI advisor | Conversational interface with follow-up prompts; answers generated from the customer's actual data, with volatility, interest, and confidence caveats |
| Data entry | Connect an account, add income or expense transactions, and create savings goals from the home quick-add row or each page. Balances, spending, health score and Poyo's plan recalculate immediately |
| What-if planner | Pick a trip, purchase or move, set the cost and date, and see the monthly cost against your real surplus. Poyo gives a plain-English verdict, a month-by-month plan, and can turn the scenario into a savings goal |
| Poyo companion | The line-art cat reads the same accounts: a ranked "do this first, then this, hold off on that" plan, an explain-why button on every recommendation, and a small chat that answers questions with the numbers behind the advice |
| Scam protection | Call log with color-coded scam scores, location comparison and full transcripts; area-code blocklist; paste a fictional transcript for local analysis of urgency, credential requests, payment instructions, impersonation, threats and record mismatches; transaction and balance cross-checks |
| Incoming call simulator | Hidden `/test-dialer` page with a phone keypad, caller name, a 5-second simulated call, live microphone transcription via the browser Web Speech API (or a scripted demo transcript), area-code/network location comparison, and a POST to `/handle-transcript` that writes the scored call to `call_logs` |
| Forecast | 3/6/12-month projections for income, expenses, debt payments, savings and balances; warning radar; category drift; what-if sliders; confidence disclosure |
| Rewards | Spend-matched partner offers, estimated savings on existing spend, sponsored labels, personalization toggle, saved offers, privacy explanation |
| Gamification | **Mission control** with Poyo the line-art companion, XP and rank ladder, milestones, optional missions and a positive-cash-flow streak. A persistent companion strip shows rank and XP on every page. Points are motivational only — never awarded for borrowing or spending more |
| Auth & persistence | Demo mode in local storage; Supabase mode with cookie sessions, Row Level Security, account/goal/chat persistence and a seed script |

## Stack

- **Next.js 15** App Router, Server Components, Route Handlers
- **TypeScript** (strict)
- **Tailwind CSS 3.4** with custom design tokens
- **Supabase** (`@supabase/ssr`) for authentication, Postgres and RLS
- **Recharts** for charts, **Lucide React** for icons
- No other database, no bank integration, no external AI provider

## Run locally (demo mode)

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables, PoyoVault runs on the sample customer **Maya Chen**:

- 8 accounts across Chase, Ally, Capital One, American Express, Rocket Mortgage, Toyota Financial and Nelnet
- 7 months of deterministic transactions
- 3 savings goals, 6 subscriptions, 10 partner offers

Demo changes (goal contributions, connected accounts, privacy toggles, chat) persist in `localStorage` for that browser. Settings → **Reset the demo workspace** restores the original sample.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates:
   - `profiles`, `accounts`, `transactions`, `goals`, `user_preferences`, `chat_messages`
   - `call_logs`, `blocked_area_codes` and their per-user RLS policies
   - a read-only `partner_offers` catalogue
   - RLS policies scoped to `auth.uid() = user_id` on every customer-owned table
   - a trigger that creates a profile and privacy defaults for each new auth user
3. Copy `.env.example` to `.env.local` and add:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```
4. Restart `npm run dev`, then open `/login` and create an account.
5. Optional — seed the sample customer into the authenticated account:
   ```bash
   # add SUPABASE_SERVICE_ROLE_KEY to .env.local first (server-only, never commit)
   npm run seed -- you@example.com
   ```

Without seeding, an authenticated account shows the demo dataset and a **Demo data** badge until accounts exist in Supabase. Once seeded, the app loads from your database and mutations (goal contributions, account connections/disconnections, subscription cancellations, preferences, chat) are written back under RLS.

> The `SUPABASE_SERVICE_ROLE_KEY` is used **only** by `scripts/seed-supabase.ts` and must never be exposed to the browser, committed, or set as a `NEXT_PUBLIC_*` variable.

### Call logging and the hidden test dialer

Open `/test-dialer` directly — it is intentionally not linked in the navigation. Type a caller name and 10-digit US number (or use the sample), choose **Phone mic** or **Scripted demo**, set the simulated network origin, and start the 5-second call. It posts to `/handle-transcript`, which:

- extracts the area code and resolves its registered state/city from the bundled NANP lookup;
- compares it with the call's network location from simulated test metadata, edge headers, or the free `ipwho.is` GeoIP fallback;
- adds 50 points for a non-US or cross-state mismatch (capped at 100);
- checks the signed-in customer's `blocked_area_codes` and forces a blocked call to 100/100;
- analyzes the transcript with the deterministic scam engine and saves the score, findings, caller/network locations and full transcript to `call_logs`.

The call log and blocklist are shown on **Scam protection**, and the latest call appears on the home dashboard. With no Supabase environment variables the app is in demo mode: calls and blocks are stored in `localStorage` for that browser instead of Postgres. Microphone transcription requires HTTPS and browser support; the scripted demo works without either. No real call is placed.

### Auth notes

- `/login` is the only public route when Supabase is configured; middleware refreshes sessions and redirects unauthenticated visitors.
- `/auth/callback` exchanges the email-confirmation code for a cookie session.
- Add your deployed origin (`https://your-app.vercel.app/auth/callback`) to Supabase → Authentication → URL Configuration → Redirect URLs.
- Sign-out is a POST to `/auth/signout`; mutations are POST-only and reject cross-origin requests.
- API route mutations re-derive the user from the session cookie and scope every query by `user_id`. The client never supplies its own user id.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import it in Vercel. Framework preset: **Next.js**; build command `npm run build`.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under Project → Settings → Environment Variables for Production and Preview.
4. Deploy, then add the production and preview callback URLs in Supabase Auth settings.

No server-only secrets are required at runtime. Supabase service-role access is not used by the deployed app.

## Architecture

```
app/
  (app)/                 authenticated/demo shell + 11 pages
  login/                 auth screen (demo fallback when unconfigured)
  auth/                  callback + signout route handlers
  api/finance/mutate/    RLS-scoped mutation endpoint
components/
  layout/                sidebar, header, mobile navigation, notifications
  dashboard/             portfolio summary, tabbed account ledger, Poyo's plan
  accounts/ spending/ debt/ savings/ advisor/ forecast/ rewards/ settings/ scam/
  gamification/          mission control page (XP, ranks, milestones, missions)
  charts/                Recharts wrappers + SVG score gauge and sparklines
  shared/                insight cards, category icons, gamification panel, Poyo mascot + chat
  ui/                    buttons, cards, badges, progress, modal, toggles
lib/
  types.ts               domain types
  data/                  curated fixtures, deterministic sample builder, Supabase loader
  finance/               aggregation, scoring, insights, priorities (next best moves),
                         debt simulation, forecasting, rewards, gamification,
                         formatting, mutations
  ai/                    grounded advisor + local scam analysis engine
  supabase/              browser/server clients + config
supabase/schema.sql      tables, indexes, RLS, new-user trigger
scripts/seed-supabase.ts optional local seeding via service role
```

### Data flow

One `FinancialProfile` (accounts, transactions, goals, preferences, offers) feeds every page through a client `FinanceProvider`. Pages are thin route files; all calculations live in pure TypeScript functions. Supabase mode loads the same shape on the server; demo mode loads curated data and persists to local storage.

### Financial model

- **Health score (0–100):** weighted factors — debt-to-income (25%), card utilization (20%), emergency months (20%), monthly cash flow (15%), income consistency (10%), discretionary share (10%). Each factor exposes its sub-score, value and a plain-English explanation. No black box.
- **Emergency target:** 3 × essential expenses (housing, utilities, groceries, transport, healthcare, insurance, minimum debt payments), excluding discretionary categories.
- **Essential expense baseline:** trailing three complete months.
- **Debt simulation:** month-by-month interest accrual at APR/12, all minimums protected, surplus allocated avalanche (rate) or snowball (balance), freed payments rolled forward.
- **Forecast:** per-category linear trend dampened to ±6% of the category mean per month; constant recent income; debt amortised with required payments; savings = opening balance + cumulative net cash flow. Warnings are derived from projected deficits, falling savings, payment burden, category drift and near-term due dates.
- **Advisor:** deterministic intent routing over the same calculations. It cites actual amounts, rates and dates, and discloses that projections are not guarantees. The interface (`lib/ai/advisor.ts`) is isolated so a language model could be added later without changing the UI.

### Determinism

`lib/data/sample.ts` uses a stable FNV-style hash keyed by merchant and month. Reloads and server/client renders produce the same ledger for the same day. All charts, totals, scores, forecasts and recommendations are computed from it.

## Privacy & security posture

- No real bank credentials are requested or stored. The connect flow is explicitly simulated and shows read-only permissions.
- Account disconnection removes the account, its transactions and goal links in the prototype; production would also revoke the aggregator token.
- Row Level Security is enabled on all customer tables with `auth.uid() = user_id` checks.
- Privacy controls independently govern AI analysis, reward matching, product analytics and third-party sharing. AI analysis can be paused without losing calculations.
- Sponsored offers are labelled; sponsorship never affects scoring, debt advice or recommendations.
- Pasting a transcript on Scam protection analyzes it in the browser tab without saving it. The hidden `/test-dialer` can access the microphone through the browser's Web Speech API; its transcript, score, caller and network locations are written to Supabase `call_logs` when configured, or to localStorage in demo mode. No real call is placed, and the test page is not linked in navigation.
- The advisor is educational, not regulated financial advice. Forecasts and payoff simulations are illustrations, not guarantees.

## Known limitations

- Bank connections are simulated; no aggregation provider is integrated.
- The advisor and scam protection are deterministic analysis engines, not LLMs. That is intentional for prototype reliability and data privacy.
- Scam protection cannot verify who actually called, analyze voice or access real phone records. It can miss a scam or flag a legitimate call; example transcripts and financial data are fictional. A missing transaction is never treated as proof of fraud. Area-code locations rely on registration data and can be wrong when numbers are ported; a network mismatch is a risk signal, not proof of fraud.
- Microphone transcription in the test dialer requires an HTTPS origin and browser support. Without it, the scripted demo transcript is used. GeoIP lookup falls back to edge headers when available and otherwise leaves the network origin unknown rather than inventing one.
- Reward offers and expiry dates are fictional.
- Supabase mode requires the schema and (optionally) the seed script to be applied manually. Seeded accounts live under the user you choose; the app does not auto-create financial data for new sign-ups.
- Goal contributions update goal saved amounts and linked account balances, but do not create transfer transactions.
- No automated test suite yet; verification is `npm run typecheck` plus a production build and manual flow checks.
- Mission control XP, ranks and streaks are motivational only. They have no cash value, do not affect the health score and are not a credit signal.
- Poyo's plan and chat are deterministic guidance over simulated data, not an LLM and not regulated financial advice. They cannot see accounts you have not connected.

## Design

Near-black navy (`#050713`–`#0F1430`) with a compact violet gradient app bar, hairline-bordered flat panels, crisp 8–12px geometry, tabular numerals and Inter throughout. The visual language is closer to a data terminal than a marketing site: muted metadata, strong financial values, violet selection states and mint/coral risk accents. Responsive from 360px mobile through wide desktop, with a fixed four-item bottom dock on small screens and reduced-motion-safe transitions.

**Poyo** remains the one expressive layer — the line-art cat with oversized ears, oval eyes and a rectangular lens appears in navigation, the plan, the what-if card, login and the `/progress` mission-control page, with a subtle blink and float. Decorative scanlines, large hero gradients and heavy glass shadows have been removed so account data stays the focus.

The layout takes its cues from a full-service brokerage dashboard rather than a generic AI product: a dense portfolio and account ledger, a persistent right-hand rail for health and next actions, tabular numbers, monospaced labels, thin rules and flat panels. Cyberpunk colour and texture are used as accents — cyan, violet and coral on near-black — not as glass everywhere.

Poyo's advice is ordered, not a list of equal suggestions: `lib/finance/priorities.ts` names the first debt to attack, what to leave on its normal payment, when to fund the emergency cushion, and what to hold off on, using the same deterministic profile as every other calculation. The same reasoning powers the inline "ask why" buttons and the Poyo chat, which runs locally through the existing advisor engine.

All decorative animation is disabled under `prefers-reduced-motion: reduce`, and gamification data is derived from the same deterministic `FinancialProfile` as every other calculation.
