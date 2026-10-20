import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../db/connection.js";
import { candidatesRouter as candidatesRouterBase } from "../routes/candidates.js";
import { test, expect, beforeAll, afterAll } from "vitest";
import {
  createSessionCookie,
  getOrCreateCandidate,
  getOrCreateRecruiter,
  withAuth,
} from "./utils.js";

const client = await pool.connect();
const db = drizzle(client);

const candidatesRouter = withAuth(candidatesRouterBase);

let authCookie: string;

let lastCandidateId: string;

beforeAll(async () => {
  const recruiter = await getOrCreateRecruiter({
    email: "recruiter@example.com",
  });
  authCookie = await createSessionCookie(recruiter.id);
  const candidate = await getOrCreateCandidate({
    email: "candidate@example.com",
  });
  lastCandidateId = candidate.id;
});

test("get candidates", async () => {
  const response = await candidatesRouter.request("/candidates", {
    headers: {
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.length).toBeGreaterThan(0);
  expect(body[0].id).toBeDefined();
});

test("create candidate", async () => {
  const response = await candidatesRouter.request("/candidates", {
    method: "POST",
    body: JSON.stringify({
      name: "John Doe",
      email: "john.doe.1@example.com",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBeDefined();
  lastCandidateId = body.id;
  expect(body.name).toBe("John Doe");
  expect(body.email).toBe("john.doe.1@example.com");
});

test("get candidate", async () => {
  const response = await candidatesRouter.request(
    `/candidates/${lastCandidateId}`,
    {
      headers: {
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(lastCandidateId);
  expect(body.name).toBe("John Doe");
  expect(body.email).toBe("john.doe.1@example.com");
});

test("update candidate", async () => {
  const response = await candidatesRouter.request(
    `/candidates/${lastCandidateId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: "John Doe 2",
        email: "john.doe.2@example.com",
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(lastCandidateId);
  expect(body.name).toBe("John Doe 2");
  expect(body.email).toBe("john.doe.2@example.com");
});

test("delete candidate", async () => {
  const response = await candidatesRouter.request(
    `/candidates/${lastCandidateId}`,
    {
      method: "DELETE",
      headers: {
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Candidate deleted successfully");
});

test("get deleted candidate", async () => {
  const response = await candidatesRouter.request(
    `/candidates/${lastCandidateId}`,
    {
      headers: {
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Candidate not found");
});

afterAll(() => {
  db.$client.release();
});
