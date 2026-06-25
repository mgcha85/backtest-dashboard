# Backtest Lab Dashboard

A cyberpunk-themed SvelteKit dashboard for exploring algorithm backtest results from SQLite database.

## Features

### 1. Overview Page (`/`)
- **4 KPI Cards**: Best Sharpe, Best Win Rate, Total Algorithms, Total Trades
- **Sortable Ranking Table**: All algorithms with key metrics
- Click any row to navigate to detail page
- Real-time filtering via sidebar

### 2. Comparison Page (`/compare`)
- **Multi-select up to 5 algorithms**
- **Radar Chart**: Normalized metrics comparison
- **Bar Chart**: Absolute metrics comparison
- **Detailed Comparison Table**: Side-by-side metrics

### 3. Detail Page (`/algorithm/[id]`)
- **Algorithm Metadata**: Model type, timeframe, market, parameters
- **Summary KPIs**: Averaged metrics across folds
- **Box Plot**: Metric distribution across folds
- **Fold-by-fold Results Table**: Complete fold breakdown

### 4. Persistent Filters (All Pages)
- **Sidebar Navigation**: Quick page switching
- **Multi-select Filters**: Model type, timeframe, market, denoising
- **URL Persistence**: Filters saved in URL search params
- **Clear Button**: Reset all filters

## Tech Stack

- **Framework**: SvelteKit 2 (Svelte 5 runes)
- **Database**: better-sqlite3 (read-only)
- **Charts**: Chart.js + @sgratzl/chartjs-chart-boxplot
- **Styling**: Custom CSS design system (no Tailwind)
- **TypeScript**: Full type safety

## Design System

**Aesthetic**: Dark Cyberpunk Data Lab

- **Colors**: Dark navy backgrounds (#0a0e27, #16213e) with cyan/purple accents
- **Typography**: Monospace display font (SF Mono fallbacks) for technical feel
- **Layout**: Fixed sidebar (280px) with scrollable main content
- **Tables**: Sortable headers, hover states, color-coded positive/negative values
- **Charts**: Dark theme with custom tooltips and legends

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Type check
npm run check

# Build for production
npm run build
```

## Database

- **Path**: `/mnt/data/finance/backtest_results.db` (hardcoded, read-only)
- **Tables**: `algorithms`, `backtest_results`, `backtest_summary`
- **Access**: Server-side only via `+page.server.ts` load functions

## File Structure

```
src/
├── app.css                          # Global design system
├── lib/
│   ├── db.ts                        # Database utilities and types
│   └── components/
│       └── FilterSidebar.svelte     # Shared filter sidebar
└── routes/
    ├── +layout.svelte               # Root layout with CSS import
    ├── +page.svelte                 # Overview page
    ├── +page.server.ts              # Overview data loading
    ├── compare/
    │   ├── +page.svelte             # Comparison page
    │   └── +page.server.ts          # Comparison data loading
    └── algorithm/[id]/
        ├── +page.svelte             # Detail page
        └── +page.server.ts          # Detail data loading
```

## Key Design Decisions

1. **No Tailwind**: Custom CSS design system for full aesthetic control
2. **Server-side Data Loading**: Database queries in `+page.server.ts` files
3. **URL-based Filtering**: Filters persist via search params (shareable links)
4. **Monospace Display**: Technical aesthetic with SF Mono font stack
5. **Color-coded Values**: Green for positive, red for negative metrics
6. **Responsive**: Mobile-friendly with collapsible sidebar

## Metrics Displayed

- **ML Metrics**: AUC, F1, Precision, Recall
- **Trading Metrics**: Win Rate, Profit Factor, Sharpe, Max Drawdown
- **Performance**: Total Return, Avg Return per Trade, Number of Trades

## Browser Support

Modern browsers with ES2020+ support (Chrome, Firefox, Safari, Edge latest versions).
