import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../db/connection.js";
import { usersTable } from "../db/schema.js";
import { candidatesRouter as candidatesRouterBase } from "../routes/candidates.js";
import { test, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  createSessionCookie,
  getOrCreateCandidate,
  getOrCreateRecruiter,
  getOrCreateUser,
  withAuth,
} from "./utils.js";

const client = await pool.connect();
const db = drizzle(client);

const candidatesRouter = withAuth(candidatesRouterBase);

let authCookie: string;
let adminCookie: string;

let lastCandidateId: string;

beforeAll(async () => {
  const recruiter = await getOrCreateRecruiter({
    email: "recruiter@example.com",
  });
  authCookie = await createSessionCookie(recruiter.id);
  const admin = await getOrCreateUser({
    email: "admin@example.com",
    name: "Admin",
    role: "admin",
  });
  adminCookie = await createSessionCookie(admin.id);
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
      Cookie: adminCookie,
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
        Cookie: adminCookie,
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
        Cookie: adminCookie,
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
        Cookie: adminCookie,
      },
    },
  );
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Candidate not found");
});

test("anonymous candidate list is unauthorized", async () => {
  const response = await candidatesRouter.request("/candidates");
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ message: "Unauthorized" });
});

test("soft-deleted admin cannot list candidates", async () => {
  const admin = await getOrCreateUser({
    email: "deleted-admin@example.com",
    name: "Deleted Admin",
    role: "admin",
    deletedAt: new Date(),
  });
  const cookie = await createSessionCookie(admin.id);
  const response = await candidatesRouter.request("/candidates", {
    headers: { Cookie: cookie },
  });
  expect(response.status).toBe(401);
});

test("candidate cannot read a missing candidate", async () => {
  const candidate = await getOrCreateUser({
    email: "candidate-reader@example.com",
    name: "Candidate Reader",
    role: "candidate",
  });
  const cookie = await createSessionCookie(candidate.id);
  const response = await candidatesRouter.request("/candidates/missing-user", {
    headers: { Cookie: cookie },
  });
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ message: "Forbidden" });
});

test("recruiter cannot update a candidate", async () => {
  const candidate = await getOrCreateUser({
    email: "unchanged-candidate@example.com",
    name: "Unchanged Candidate",
    role: "candidate",
  });
  const response = await candidatesRouter.request(`/candidates/${candidate.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: "Changed",
      email: "changed-candidate@example.com",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(403);
  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, candidate.id));
  expect(row.name).toBe("Unchanged Candidate");
  expect(row.email).toBe("unchanged-candidate@example.com");
});

test("candidate list returns live candidates only", async () => {
  const candidate = await getOrCreateUser({
    email: "listed-candidate@example.com",
    name: "Listed Candidate",
    role: "candidate",
  });
  const recruiter = await getOrCreateUser({
    email: "listed-recruiter@example.com",
    name: "Listed Recruiter",
    role: "recruiter",
  });
  const admin = await getOrCreateUser({
    email: "listed-admin@example.com",
    name: "Listed Admin",
    role: "admin",
  });
  const deletedCandidate = await getOrCreateUser({
    email: "listed-deleted-candidate@example.com",
    name: "Listed Deleted",
    role: "candidate",
    deletedAt: new Date(),
  });
  const response = await candidatesRouter.request("/candidates", {
    headers: { Cookie: authCookie },
  });
  expect(response.status).toBe(200);
  const body: { id: string }[] = await response.json();
  const ids = new Set(body.map((row) => row.id));
  expect(ids.has(candidate.id)).toBe(true);
  expect(ids.has(recruiter.id)).toBe(false);
  expect(ids.has(admin.id)).toBe(false);
  expect(ids.has(deletedCandidate.id)).toBe(false);
});

test("recruiter read of a recruiter is not a candidate", async () => {
  const recruiter = await getOrCreateUser({
    email: "read-recruiter@example.com",
    name: "Read Recruiter",
    role: "recruiter",
  });
  const response = await candidatesRouter.request(`/candidates/${recruiter.id}`, {
    headers: { Cookie: authCookie },
  });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: "Candidate not found" });
});

test("admin delete of a recruiter leaves that user unchanged", async () => {
  const recruiter = await getOrCreateUser({
    email: "keep-recruiter@example.com",
    name: "Keep Recruiter",
    role: "recruiter",
  });
  const response = await candidatesRouter.request(
    `/candidates/${recruiter.id}`,
    {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    },
  );
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: "Candidate not found" });
  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, recruiter.id));
  expect(row.deletedAt).toBeNull();
});

test("admin restores a soft-deleted candidate with the same email", async () => {
  const candidate = await getOrCreateUser({
    email: "restore-candidate@example.com",
    name: "Old Name",
    role: "candidate",
    deletedAt: new Date(),
  });
  const before = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, candidate.email));
  const response = await candidatesRouter.request("/candidates", {
    method: "POST",
    body: JSON.stringify({
      name: "Restored Name",
      email: candidate.email,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
  });
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({
    id: candidate.id,
    name: "Restored Name",
    email: candidate.email,
  });
  const after = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, candidate.email));
  expect(after).toHaveLength(before.length);
  expect(after[0].id).toBe(candidate.id);
  expect(after[0].name).toBe("Restored Name");
  expect(after[0].deletedAt).toBeNull();
  expect(after[0].role).toBe("candidate");
});

test("admin cannot create a candidate with a soft-deleted recruiter email", async () => {
  const recruiter = await getOrCreateUser({
    email: "deleted-recruiter@example.com",
    name: "Deleted Recruiter",
    role: "recruiter",
    deletedAt: new Date(),
  });
  const response = await candidatesRouter.request("/candidates", {
    method: "POST",
    body: JSON.stringify({
      name: "New Candidate",
      email: recruiter.email,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "Candidate already exists" });
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, recruiter.email));
  expect(rows).toHaveLength(1);
  expect(rows[0].id).toBe(recruiter.id);
  expect(rows[0].deletedAt).not.toBeNull();
  expect(rows[0].role).toBe("recruiter");
});

test("admin cannot change a candidate email to one already taken", async () => {
  const candidate = await getOrCreateUser({
    email: "email-owner@example.com",
    name: "Email Owner",
    role: "candidate",
  });
  const other = await getOrCreateUser({
    email: "email-taken@example.com",
    name: "Email Taken",
    role: "candidate",
  });
  const response = await candidatesRouter.request(`/candidates/${candidate.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: "Email Owner",
      email: other.email,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "Candidate already exists" });
  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, candidate.id));
  expect(row.name).toBe("Email Owner");
  expect(row.email).toBe("email-owner@example.com");
});

test("admin can update a candidate with their current email", async () => {
  const candidate = await getOrCreateUser({
    email: "same-email@example.com",
    name: "Same Email",
    role: "candidate",
  });
  const response = await candidatesRouter.request(`/candidates/${candidate.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: "Same Email Updated",
      email: candidate.email,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: candidate.id,
    name: "Same Email Updated",
    email: candidate.email,
  });
});

afterAll(() => {
  db.$client.release();
});
