# Stockscope 

The High-Precision Terminal for Indonesian Equity Markets.

Ground-up frontend UI/UX integration has been implemented while preserving existing backend APIs and data contracts.

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TailwindCSS 4
- MongoDB
- NextAuth
- next-intl (i18n)

## Frontend Architecture

### Core Shell
- `src/components/features/integration/AppShell.tsx`
	- Desktop sidebar navigation
	- Mobile bottom navigation
	- Shared route framing for all primary user journeys

### Route Workspaces
- `app/[locale]/page.tsx` -> `OverviewWorkspace`
- `app/[locale]/screener/page.tsx` -> `ScreenerWorkspaceV2`
- `app/[locale]/owners/page.tsx` -> `OwnersWorkspace`
- `app/[locale]/profile/page.tsx` -> shell-based profile view
- `app/[locale]/watchlist/page.tsx` -> shell-based watchlist view

### Design System
- Global design tokens and layout styles are defined in `app/globals.css`.
- Tokens cover surfaces, text, semantic accents, tier colors, spacing rhythm, and responsive shell behavior.

## Existing Backend Integration (Unchanged)

The frontend consumes existing API routes without changing contracts:
- `GET /api/stocks`
- `GET /api/stocks/enriched`
- `GET /api/screener`
- `GET /api/screener/filters`
- `GET /api/analytics`
- `GET /api/owners`
- `POST /api/payment/create`
- `POST /api/payment/webhook`
- `GET /api/health`

## Getting Started

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm

### Installation
```bash
git clone https://github.com/cuantepreneurindonesia/stockscope.git
cd stockscope
npm install
cp .env.example .env.local
# Fill in .env.local values
npm run dev
```

## Project Structure
```text
app/              # App Router pages and API routes
src/
├── components/   # React components (integration/features/ui/layout)
├── hooks/        # Custom React hooks
├── lib/          # Utilities, services, and configs
├── types/        # TypeScript types
└── styles/       # Global styles
```

## Available Scripts
| Command | Description |
|---------|-------------|
| npm run dev | Start dev server |
| npm run build | Build for production |
| npm run lint | Run ESLint |
| npm run type-check | Run TypeScript check |

## Environment Variables
See `.env.example` for all required variables.

## Contributing
1. Create feature branch from `main`
2. Make changes
3. Open PR with description of changes
