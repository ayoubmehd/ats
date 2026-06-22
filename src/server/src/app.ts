import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { usersTable } from './db/schema.js';

const db = drizzle(process.env.DATABASE_URL!);

const app = new Hono<{ Variables: { db: typeof db } }>()

app.use(async (c, next) => {
  c.set('db', db);
  await next();
})

app.get('/', async (c) => {
  const db = c.get('db');
  const result = await db.select().from(usersTable);
  return c.json(result);
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
