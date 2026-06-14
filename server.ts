import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { sendSMSAlert, sendEmailAlert } from './src/lib/notifications';
import { fetchQuotes } from './src/lib/services/priceService';
import { stockQueries } from './src/lib/mongodb';
import express from 'express';
import compression from 'compression';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import Stripe from 'stripe';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

app.prepare().then(() => {
  const expressApp = express();

  // Phase 2: Gzip compression for all API responses
  expressApp.use(compression());

  // Phase 3: Stripe Webhook Flow (Must bypass JSON body-parser)
  if (dev === false) {
    // In production, fail fast if required Stripe env vars are missing
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set in production');
    }
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_dev', {
    apiVersion: '2022-11-15' as any,
  });

  expressApp.post(
    '/api/webhook/stripe',
    express.raw({ type: 'application/json' }),
    async (req: express.Request, res: express.Response) => {
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig as string,
          process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_key_for_dev'
        );
      } catch (err: any) {
        console.error(`Webhook signature verification failed:`, err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }

      if (event.type === 'checkout.session.completed') {
        const session: any = event.data.object;
        if (session.client_reference_id) {
          try {
            await prisma.user.update({
              where: { id: session.client_reference_id },
              data: { plan: 'premium' },
            });
            console.log(`Successfully upgraded user ${session.client_reference_id} to Premium`);
          } catch (dbErr) {
            console.error('Database update failed:', dbErr);
          }
        }
      }
      res.json({ received: true });
    }
  );

  // Swagger Setup (Phase 2)
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: { title: 'Stockscope API', version: '1.0.0', description: 'API Documentation for Stockscope' },
      servers: [{ url: '/api', description: 'Next.js App Router API endpoints' }],
    },
    apis: ['./app/api/**/*.ts', './server.ts'],
  };
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  expressApp.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  expressApp.all('*', (req: express.Request, res: express.Response) => {
    try {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.status(500).send('internal server error');
    }
  });

  const server = createServer(expressApp);

  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',')
    : dev
    ? ['http://localhost:3000']
    : [];

  const io = new SocketIOServer(server, { 
    path: '/socket.io', 
    cors: { origin: allowedOrigins, credentials: true } 
  });

  io.on('connection', (socket) => {
    console.log('Socket client connected: ', socket.id);
    
    // User joins their specific room — requires a non-empty userId.
    // Full NextAuth JWT token verification should be added before production use.
    socket.on('join_room', (data: { userId: string }) => {
      const userId = typeof data === 'object' && data !== null ? data.userId : undefined;
      if (!userId || typeof userId !== 'string') {
        socket.emit('alert:error', { message: 'Unauthorized: userId required to join room' });
        return;
      }
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined room user:${userId}`);
      socket.emit('alert:status', { message: 'Successfully joined room' });
    });

    socket.on('disconnect', () => {
      console.log('Socket client disconnected: ', socket.id);
    });
  });

  // Real-time-ish price engine.
  //
  // On each tick we fetch live quotes from the price provider (Yahoo Finance),
  // persist them to the screener's price fields, broadcast them to all clients
  // for the live table, and evaluate active price alerts against real prices.
  const PRICE_REFRESH_MS = Number(process.env.PRICE_REFRESH_MS) || 30_000;
  // Cap the broad refresh so we don't hammer the upstream provider. Alert
  // tickers are always included on top of this working set.
  const MAX_REFRESH_CODES = Number(process.env.PRICE_MAX_CODES) || 150;

  let priceRefreshInFlight = false;
  setInterval(async () => {
    if (priceRefreshInFlight) return; // avoid overlapping ticks on slow upstream
    priceRefreshInFlight = true;
    try {
      // 1. Active alerts drive which tickers we *must* have fresh prices for.
      const alerts = await prisma.priceAlert.findMany({
        where: { isActive: true },
      });
      const alertTickers = alerts.map((a: { ticker: string }) => a.ticker);

      // 2. Plus a bounded slice of the universe so the screener table is live.
      let universe: string[] = [];
      try {
        universe = (await stockQueries.allCodes()).slice(0, MAX_REFRESH_CODES);
      } catch (dbErr) {
        console.error('[price] failed to load stock universe:', dbErr);
      }

      const codes = [...new Set([...alertTickers, ...universe])];
      if (codes.length === 0) return;

      // 3. Fetch live quotes. Failed symbols are simply absent from the map.
      const quotes = await fetchQuotes(codes);
      if (quotes.size === 0) return;

      // 4. Persist price-feed fields (ownership fields untouched).
      const updates = [...quotes.values()];
      try {
        await stockQueries.bulkUpdatePrices(updates);
      } catch (dbErr) {
        console.error('[price] failed to persist prices:', dbErr);
      }

      // 5. Broadcast to all connected clients for the live table.
      io.emit('prices:update', {
        at: Date.now(),
        prices: updates.map((q) => ({
          code: q.code,
          lastPrice: q.lastPrice,
          volume: q.volume,
          marketCap: q.marketCap,
        })),
      });

      // 6. Evaluate alerts against the freshly fetched real prices.
      for (const alert of alerts) {
        const quote = quotes.get(alert.ticker.toUpperCase());
        if (!quote) continue; // no fresh price this tick; try again next time
        const price = quote.lastPrice;

        let triggered = false;
        if (alert.condition === 'above' && price >= alert.targetPrice) triggered = true;
        if (alert.condition === 'below' && price <= alert.targetPrice) triggered = true;
        if (!triggered) continue;

        console.log(`[ALERT] Triggered alert for ${alert.userId} on ${alert.ticker}`);

        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { isActive: false, triggeredAt: new Date() },
        });

        io.to(`user:${alert.userId}`).emit('alert:triggered', {
          stock: alert.ticker,
          message: `Target ${alert.condition} ${alert.targetPrice} hit! Current: ${price.toFixed(0)}`,
          price,
        });

        const user = await prisma.user.findUnique({ where: { id: alert.userId } });
        if (user && user.plan === 'premium') {
          if (alert.notifySms) {
            // Assuming we have user.phone, we use a mock for now
            sendSMSAlert('+1234567890', `Stockscope Alert: ${alert.ticker} hit ${price.toFixed(2)}`);
          }
          if (alert.notifyEmail) {
            sendEmailAlert(user.email, `Stockscope Alert: ${alert.ticker}`, `<p>${alert.ticker} recently crossed your target!</p>`);
          }
        }
      }
    } catch (error) {
      console.error('Price refresh error:', error);
    } finally {
      priceRefreshInFlight = false;
    }
  }, PRICE_REFRESH_MS);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err?: any) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
