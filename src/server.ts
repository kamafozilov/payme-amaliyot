import { serve } from '@hono/node-server';
import app from './index.js';

const port = process.env.PORT || 9000;

serve({
  fetch: app.fetch,
  port: Number(port),
});

console.log(`🚀 Server running on port: ${port}`);
