import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { paymeRoutes } from './modules/payme/payme.routes.js';

const app = new Hono().basePath('/api');

app.use('*', async (c, next) => {
  c.header('Content-Type', 'application/json');
  await next();
});

app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/', c =>
  c.json({
    message: 'Payment Services',
    version: '1.0.0',
  }),
);

app.route('/payme', paymeRoutes);

export default app;
