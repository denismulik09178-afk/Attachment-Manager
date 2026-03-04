# DENI AI BOT - AI Trading Signals Platform

## Overview

This is a web application that provides AI-powered trading signals for Forex markets. The platform uses **real TradingView Technical Analysis API** data to generate signals with Ukrainian AI explanations. Signals display UP/DOWN direction with TradingView charts, animated expiration timers, and trade results (WIN/LOSE). The application does NOT execute trades - it only provides signals for manual trading.

## Recent Changes (March 2026)

### Major UI Redesign v2 (March 4, 2026)
- **DENI AI BOT branding**: Header and signal generator both prominently display "DENI AI BOT"
- **New Color Scheme**: Primary changed from teal (174) to richer green (160 84% 39%), darker background (225 25% 6%)
- **4-tab navigation**: Сигнали / Ринок / Історія / Адмін (added Market/News page)
- **Dashboard Features**:
  - Stats bar: Accuracy %, total signals, market volatility
  - Live price ticker: EUR/USD, GBP/USD, USD/JPY, USD/CHF with % change
  - Trading tip of the day
  - Pair picker with search and favorites (starred pairs sort first)
  - Dual buttons: "Отримати сигнал" + "Швидкий аналіз"
  - Animated indicator analysis during generation (RSI, MACD, EMA, Stoch)
- **Market/News Page** (`/news`):
  - Trading sessions status (NY, London, Tokyo, Sydney) with active/closed indicator
  - Market volatility gauge
  - Major pairs overview with live prices and % change
  - Economic calendar with impact levels (high/medium/low)
  - Daily trading tip
- **Signal Cards**: Colored top border, 3-column price grid (Entry/Current/P&L with pips), direction badges, urgency coloring
- **History Page**: 4-stat header (Total/Wins/Losses/WinRate), per-pair statistics grid, timeframe display
- **Backend Endpoints Added**:
  - `GET /api/market/news` — sessions, volatility, economic calendar, tips
  - `GET /api/market/overview` — live prices for 4 major pairs from TradingView

### AI-Powered Signal Generation
- **AI as Decision Maker**: GPT-4o-mini analyzes market and decides UP/DOWN
- **Binary Options Focus**: Optimized for short timeframes (1-30 minutes)
- **Smart Signal Preprocessing**: RSI, Stochastic, Bollinger Bands, CCI, ADX, MACD
- **AI Chooses Timeframe**: 1/3/5/10/15/30 min based on signal strength
- **Ukrainian Explanations**: All explanations in Ukrainian

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter (4 routes: /, /news, /history, /admin)
- **State Management**: TanStack React Query v5 with polling
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with dark theme, green accents (hsl 160 84% 39%), glass-morphism
- **Charts**: TradingView embedded widgets
- **Animations**: Framer Motion
- **Path Aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: REST endpoints with Zod validation
- **Price Data**: TradingView Scanner API (scanner.tradingview.com)
- **AI**: OpenAI GPT-4o-mini via Replit AI Integrations

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: `shared/schema.ts` — users, pairs (21 entries), signals, admins, settings
- **Migrations**: `drizzle-kit push`

### Authentication
- **User Sessions**: Browser-based via X-Session-Id header (no Replit Auth)
- **Admin**: Username/password login (admin/deni2024), in-memory session tokens

### Key Files
- `client/src/pages/dashboard.tsx` — Main signal generation page
- `client/src/pages/news.tsx` — Market overview & news
- `client/src/pages/history.tsx` — Signal history & stats
- `client/src/pages/admin.tsx` — Admin panel
- `client/src/components/signal-card.tsx` — Active signal display
- `client/src/components/layout.tsx` — App shell with header & nav
- `client/src/index.css` — Theme & utility classes
- `server/routes.ts` — All API endpoints
- `server/smc-analysis.ts` — TradingView indicator analysis
- `shared/schema.ts` — Database schema

## Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI API base URL
