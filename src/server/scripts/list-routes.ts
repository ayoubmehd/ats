process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/ats";
process.env.AUTH_SECRET ??= "list-routes-dev-secret";
process.env.GOOGLE_ID ??= "list-routes-dev-google-id";
process.env.GOOGLE_SECRET ??= "list-routes-dev-google-secret";

const { showRoutes } = await import("hono/dev");
const { createApp } = await import("../src/create-app.js");

showRoutes(createApp());
