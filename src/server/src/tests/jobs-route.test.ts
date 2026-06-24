import { db } from "../db/connection.js";
import { applicationsTable, jobsTable, usersTable } from "../db/schema.js";
import { jobsRouter } from "../routes/jobs.js";
import { test, expect, beforeAll, afterAll } from "vitest";

let posterId: number;

beforeAll(async () => {
  await db.execute("BEGIN");
  await db.delete(applicationsTable);
  await db.delete(jobsTable);
  await db.delete(usersTable);
  const [user] = await db
    .insert(usersTable)
    .values({
      username: "Recruiter",
      email: "recruiter@example.com",
      role: "recruiter",
    })
    .returning();
  posterId = user.id;
  await db.insert(jobsTable).values({
    title: "Software Engineer",
    summary: "A great opportunity",
    content: "Full job description here",
    status: "open",
    posterId,
  });
});

test("get jobs", async () => {
  const response = await jobsRouter.request("/jobs");
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.length).toBeGreaterThan(0);
  expect(body[0].id).toBeDefined();
});

let lastJobId: number;

test("create job", async () => {
  const response = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Product Manager",
      summary: "Lead product development",
      content: "Detailed job description",
      status: "draft",
      posterId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBeDefined();
  lastJobId = body.id;
  expect(body.title).toBe("Product Manager");
  expect(body.summary).toBe("Lead product development");
  expect(body.content).toBe("Detailed job description");
  expect(body.status).toBe("draft");
  expect(body.posterId).toBe(posterId);
});

test("get job", async () => {
  const response = await jobsRouter.request(`/jobs/${lastJobId}`);
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(lastJobId);
  expect(body.title).toBe("Product Manager");
  expect(body.summary).toBe("Lead product development");
  expect(body.content).toBe("Detailed job description");
  expect(body.status).toBe("draft");
  expect(body.posterId).toBe(posterId);
});

test("update job", async () => {
  const response = await jobsRouter.request(`/jobs/${lastJobId}`, {
    method: "PUT",
    body: JSON.stringify({
      title: "Senior Product Manager",
      summary: "Lead product strategy",
      content: "Updated job description",
      status: "open",
      posterId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(lastJobId);
  expect(body.title).toBe("Senior Product Manager");
  expect(body.summary).toBe("Lead product strategy");
  expect(body.content).toBe("Updated job description");
  expect(body.status).toBe("open");
  expect(body.posterId).toBe(posterId);
});

test("delete job", async () => {
  const response = await jobsRouter.request(`/jobs/${lastJobId}`, {
    method: "DELETE",
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Job deleted successfully");
});

test("get deleted job", async () => {
  const response = await jobsRouter.request(`/jobs/${lastJobId}`);
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Job not found");
});

afterAll(async () => {
  await db.execute("ROLLBACK");
});
