import { expect, test } from "vitest";
import { createApp } from "../create-app.js";

const internalPaths = ["/-/docs", "/-/scalar", "/-/db/health"] as const;

test("docs, scalar, and database health are available outside production", async () => {
  expect(process.env.NODE_ENV).not.toBe("production");
  const app = createApp();

  const docs = await app.request("/-/docs");
  expect(docs.status).toBe(200);
  expect((await docs.json()).openapi).toBe("3.0.0");

  const scalar = await app.request("/-/scalar");
  expect(scalar.status).toBe(200);

  const health = await app.request("/-/db/health");
  expect(health.status).toBe(200);
  expect(await health.json()).toEqual({
    status: "ok",
    message: "Database is healthy",
  });
});

test("docs, scalar, and database health are hidden in production", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const app = createApp();
    for (const path of internalPaths) {
      const response = await app.request(path);
      expect(response.status).toBe(404);
    }
    const jobs = await app.request("/jobs");
    expect(jobs.status).toBe(200);
  } finally {
    if (previous === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previous;
    }
  }
});
