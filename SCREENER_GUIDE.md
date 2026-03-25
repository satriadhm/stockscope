# JCI Stock Screener - User Guide

## Overview
The JCI Stock Screener is an AI-powered analysis tool for Indonesian stocks, now integrated into the Right-to-Information platform.

## Access
Navigate to [http://localhost:3000/screener](http://localhost:3000/screener) (or `/screener` in production)

## Features

### Stock Screening
Filter and sort Indonesian stocks based on AI-powered composite scores:
- **Fundamental Analysis** (35%) - Financial metrics, ratios, growth
- **Technical Analysis** (30%) - RSI, MACD, moving averages, Bollinger Bands
- **Sentiment Analysis** (20%) - News and market sentiment
- **Liquidity Analysis** (15%) - Trading volume, float, foreign flows

### Rating System
- **🚀 STRONG BUY (80-100)** - Top-tier investment opportunities
- **📈 BUY (65-79)** - Good investment candidates
- **👁️ WATCH (50-64)** - Monitor for entry points
- **⚖️ NEUTRAL (35-49)** - No clear signal
- **⚠️ AVOID (0-34)** - High risk or poor fundamentals

### Filters
- **Search**: Find stocks by ticker or name
- **Sector**: Filter by industry sector
- **Tier**: Filter by rating tier (1-5)
- **Score Range**: Set minimum and maximum composite scores

### Sorting
Click any column header to sort:
- Composite Score
- Price & Change %
- P/E Ratio
- ROE %
- Dividend Yield %

## How the Score Works

Each stock receives a composite score (0-100) calculated as:

```
Composite = (Fundamental × 35%) + (Technical × 30%) + (Sentiment × 20%) + (Liquidity × 15%)
```

### Fundamental Score (0-100)
- Revenue growth trends
- Profitability metrics (ROE, ROA, Net Margin)
- Valuation ratios (P/E, P/B)
- Dividend policy
- Debt levels

### Technical Score (0-100)
- RSI (Relative Strength Index)
- MACD signals
- Moving average positioning (MA20, MA50, MA200)
- Bollinger Band position
- Volume analysis

### Sentiment Score (0-100)
- News sentiment analysis
- Market themes
- Corporate actions
- Analyst opinions

### Liquidity Score (0-100)
- Average daily trading value
- Free float percentage
- Foreign net buy/sell

## API Endpoints

### Get All Stocks
```
GET /api/screener
```

Query Parameters:
- `q` - Search query
- `sector` - Sector filter
- `tier` - Tier level (1-5)
- `minScore` - Minimum score
- `maxScore` - Maximum score
- `sortBy` - Sort field (composite, pe, roe, etc.)
- `order` - Sort order (asc/desc)

Example:
```bash
curl "http://localhost:3000/api/screener?sector=Finance&minScore=70&sortBy=composite&order=desc"
```

### Get Available Filters
```
GET /api/screener/filters
```

Returns:
```json
{
  "sectors": ["All", "Finance", "Infrastructure", ...]
}
```

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Optional - enables AI-powered fundamental and sentiment analysis
ANTHROPIC_API_KEY=sk-ant-your-api-key

# Optional - enables news sentiment analysis
NEWS_API_KEY=your-news-api-key
```

### Without API Keys
The screener works with mock scores. To enable full AI analysis, add the Anthropic API key.

## Integration with Ownership Data

The screener complements the existing ownership transparency features:
1. Screen stocks using the AI screener
2. Click a ticker to view detailed ownership data (coming soon)
3. Cross-reference high-scoring stocks with ownership concentration metrics

## Technical Details

### Built With
- **Next.js 16** - App Router, Server Components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **Anthropic Claude** - AI analysis
- **React** - UI components

### Scoring Algorithms
- **RSI**: 14-period Relative Strength Index
- **MACD**: 12/26/9 configuration with histogram
- **Bollinger Bands**: 20-period, 2 standard deviations
- **Moving Averages**: SMA (20, 50, 200)

### Data Sources (Current)
- Mock data for development
- Ready to integrate with:
  - Yahoo Finance API
  - IDX Official API
  - News aggregators

## Roadmap

### Phase 1 (Completed) ✅
- Basic screening functionality
- Composite scoring engine
- Filter and sort capabilities
- API endpoints

### Phase 2 (Planned)
- [ ] Individual stock detail pages
- [ ] Historical price charts
- [ ] PDF report generation
- [ ] Real-time data integration

### Phase 3 (Planned)
- [ ] Portfolio tracker
- [ ] Price alerts
- [ ] Backtesting tools
- [ ] Watchlist management

## Support

For issues or feature requests related to the screener, please check:
1. Ensure dev server is running (`npm run dev`)
2. Check browser console for errors
3. Verify API endpoints are responding
4. Check environment variables are set correctly

## License

Same as main Right-to-Information project.
