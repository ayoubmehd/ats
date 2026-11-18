import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { candidatesRouter } from "./routes/candidates.js";
import { jobsRouter } from "./routes/jobs.js";
import { db } from "./db/connection.js";
import { Scalar } from "@scalar/hono-api-reference";
import { applicationsRouter } from "./routes/applications.js";
import { initAuthConfig, authHandler } from "@hono/auth-js";
import Google from "@auth/core/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import {
  usersTable,
  accountsTable,
  sessionsTable,
  verificationTokensTable,
} from "./db/schema.js";
import { JSON_BODY_MAX_BYTES } from "./limits.js";
import { requireDev } from "./authorization.js";

export function createApp() {
  if (!process.env.GOOGLE_ID || !process.env.GOOGLE_SECRET) {
    throw new Error("GOOGLE_ID and GOOGLE_SECRET must be set");
  }

  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET must be set");
  }

  const app = new OpenAPIHono();

  app.use(
    "*",
    bodyLimit({
      maxSize: JSON_BODY_MAX_BYTES,
      onError: (c) => c.json({ message: "Payload too large" }, 413),
    }),
  );

  app.use(
    "*",
    initAuthConfig(() => {
      return {
        secret: process.env.AUTH_SECRET!,
        basePath: "/auth",
        trustHost: true,
        adapter: DrizzleAdapter(db, {
          usersTable,
          accountsTable,
          sessionsTable,
          verificationTokensTable,
        }),
        providers: [
          Google({
            clientId: process.env.GOOGLE_ID!,
            clientSecret: process.env.GOOGLE_SECRET!,
          }),
        ],
        session: {
          strategy: "database",
        },
        pages: {
          signIn: "/signin",
        },
      };
    }),
  );

  app.use("/auth/*", authHandler());

  app.route("/", candidatesRouter);
  app.route("/", jobsRouter);
  app.route("/", applicationsRouter);

  registerInternalRoutes(app);

  return app;
}

function registerInternalRoutes(app: OpenAPIHono) {
  const requireDevAccess = requireDev();
  app.use("/-/docs", requireDevAccess);
  app.use("/-/scalar", requireDevAccess);
  app.use("/-/db/health", requireDevAccess);

  app.get("/-/db/health", async (c) => {
    try {
      await db.execute("SELECT 1");
      return c.json({
        status: "ok",
        message: "Database is healthy",
      });
    } catch {
      return c.json(
        {
          status: "error",
          message: "Database is not healthy",
        },
        500,
      );
    }
  });

  app.doc("/-/docs", {
    openapi: "3.0.0",
    info: {
      title: "Web internal API Documentation",
      version: "web.0.1",
    },
  });

  app.get(
    "/-/scalar",
    Scalar({
      url: "/-/docs",
    }),
  );
}
