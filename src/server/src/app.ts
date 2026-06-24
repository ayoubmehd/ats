import { serve } from '@hono/node-server'
import { OpenAPIHono } from '@hono/zod-openapi'
import 'dotenv/config';
import { candidatesRouter } from './routes/candidates.js';
import { jobsRouter } from './routes/jobs.js';
import { db } from './db/connection.js';
import { Scalar } from '@scalar/hono-api-reference';


const app = new OpenAPIHono()

app.get('/-/db/health', async (c) => {
  try {
    await db.execute('SELECT 1');
    return c.json({
      status: 'ok',
      message: 'Database is healthy',
    });
  } catch (error) {
    return c.json({
      status: 'error',
      message: 'Database is not healthy',
    }, 500);
  }
})

app.route('/', candidatesRouter);
app.route('/', jobsRouter);

app.doc('/-/docs', {
  openapi: '3.0.0',
  info: {
    title: 'Web internal API Documentation',
    version: 'web.0.1',
  },
});


app.get('/-/scalar', Scalar({
  url: '/-/docs',
}));

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
});
