# DENI AI BOT - AI Trading Signals Platform

## Overview

This is a web application that provides AI-powered trading signals for Forex markets. The platform uses **real TradingView Technical Analysis API** data to generate 90%+ accuracy signals with Ukrainian AI explanations. Signals display UP/DOWN direction with TradingView charts, animated expiration timers, and trade results (WIN/LOSE). The application does NOT execute trades - it only provides signals for manual trading.

## Recent Changes (January 2026)

- **TradingView Integration Fixed**: Now uses real TradingView API values (Recommend.All, MA, Oscillators, RSI, MACD, ADX)
- **Indicator Logic Updated**: Uses TradingView's recommendMA for trend confirmation instead of simulated EMAs
- **Signal Quality**: Requires 15/30+ confirmation points and 2/5 oscillator confirmations
- **Timeframe Parsing**: Fixed string-to-number conversion ("5m" → 5 minutes)
- **Multi-User Isolation**: Browser session-based via X-Session-Id header

**Supported Forex Pairs:**
- EUR/USD, GBP/USD, USD/JPY, USD/CHF, USD/CAD, AUD/USD
- EUR/JPY, GBP/JPY, EUR/GBP
- AUD/CAD, AUD/CHF, AUD/JPY
- CAD/CHF, CAD/JPY, CHF/JPY
- EUR/AUD, EUR/CAD, GBP/AUD, GBP/CAD, GBP/CHF

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with custom build script
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state with 5-second polling intervals
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with dark theme optimized for trading dashboards
- **Charts**: Recharts for sparkline visualizations
- **Animations**: Framer Motion for smooth transitions and layout animations
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build**: esbuild for production bundling
- **API Pattern**: REST endpoints defined in `shared/routes.ts` with Zod validation
- **Web Scraping**: Puppeteer (puppeteer-core) for extracting live price data from Pocket Option

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` defines tables for users, pairs, signals, and settings
- **Migrations**: Managed via `drizzle-kit push` command
- **Session Storage**: PostgreSQL-backed sessions using `connect-pg-simple`

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session**: Express sessions with PostgreSQL store
- **User Model**: Defined in `shared/models/auth.ts` with mandatory tables for Replit Auth

### Key Design Decisions

1. **Shared Schema Pattern**: Database schemas and API route definitions live in the `shared/` directory to ensure type safety between frontend and backend.

2. **Real-time Updates**: Signals use 5-second polling intervals for live price updates rather than WebSockets for simplicity.

3. **AI Integration**: OpenAI API (via Replit AI Integrations) for signal analysis and explanations.

4. **TradingView Charts**: Embedded TradingView widgets display real-time Forex charts for each signal.

5. **Signal Lifecycle**: Signals have `active` or `closed` status with automatic result calculation (WIN/LOSE/DRAW) based on direction and price movement.

## External Dependencies

### Database
- **PostgreSQL**: Required. Connection via `DATABASE_URL` environment variable.

### APIs and Services
- **Replit Auth**: OAuth/OpenID Connect for user authentication
- **OpenAI API**: Used for AI-powered signal analysis (configured via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- **TradingView**: Real-time charts via embedded TradingView widgets

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI API base URL

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `openai`: AI API client
- `express-session` / `connect-pg-simple`: Session management
- `@tanstack/react-query`: Frontend data fetching
- `recharts`: Sparkline charts
- `framer-motion`: Animations