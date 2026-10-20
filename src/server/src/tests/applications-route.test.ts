import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../db/connection.js";
import { applicationsTable, jobsTable } from "../db/schema.js";
import { applicationsRouter as applicationsRouterBase } from "../routes/applications.js";
import { test, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  createSessionCookie,
  getOrCreateCandidate,
  getOrCreateRecruiter,
  withAuth,
} from "./utils.js";

const client = await pool.connect();
const db = drizzle(client);

const applicationsRouter = withAuth(applicationsRouterBase);

let posterId: string;
let applicationToRejectId: number;
let authCookie: string;
let candidateAuthCookie: string;
const candidate = await getOrCreateCandidate({
  email: "candidate@example.com",
});

beforeAll(async () => {
  const user = await getOrCreateRecruiter({ email: "recruiter@example.com" });
  posterId = user.id;
  authCookie = await createSessionCookie(user.id);
  candidateAuthCookie = await createSessionCookie(candidate.id);
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Software Engineer",
      summary: "A great opportunity",
      content: "Full job description here",
      status: "open",
      posterId: user.id,
    })
    .returning();
  await db.insert(applicationsTable).values({
    jobId: job.id,
    candidateId: candidate.id,
    resume: "https://example.com/resume.pdf",
    resumeText: "Full resume text here",
    status: "applied",
  });
  const otherCandidate = await getOrCreateCandidate({
    email: "candidate.1@example.com",
  });
  const [{ id }] = await db
    .insert(applicationsTable)
    .values({
      jobId: job.id,
      candidateId: otherCandidate.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Full resume text here",
      status: "applied",
    })
    .returning();
  applicationToRejectId = id;
  const otherRecruiter = await getOrCreateRecruiter({
    email: "recruiter.1@example.com",
  });

  const [otherJob] = await db
    .insert(jobsTable)
    .values({
      title: "Software Engineer",
      summary: "A great opportunity",
      content: "Full job description here",
      status: "open",
      posterId: otherRecruiter.id,
    })
    .returning();
  await db.insert(applicationsTable).values({
    jobId: otherJob.id,
    candidateId: candidate.id,
    resume: "https://example.com/resume.pdf",
    resumeText: "Full resume text here",
    status: "applied",
  });
});

test("get applications", async () => {
  const response = await applicationsRouter.request("/applications", {
    headers: {
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.every((app: any) => app.posterId === posterId)).toBe(true);
});

let applicationId: number;

test("create application", async () => {
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Software Engineer",
      summary: "A great opportunity",
      content: "Full job description here",
      status: "open",
      posterId: posterId,
    })
    .returning();
  const jobId = job.id;
  const response = await applicationsRouter.request("/applications", {
    method: "POST",
    body: JSON.stringify({
      jobId,
      resume: "https://example.com/resume.pdf",
      resumeText: "Full resume text here",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: candidateAuthCookie,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBeDefined();
  applicationId = body.id;
  expect(body.jobId).toBe(jobId);
  expect(body.candidateId).toBeDefined();
  expect(body.candidateId).toBe(candidate.id);
  expect(body.resume).toBe("https://example.com/resume.pdf");
  expect(body.resumeText).toBe("Full resume text here");
});

test("next stage screening", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationId}/next-stage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(applicationId);
  expect(body.status).toBe("screening");
});

test("next stage interview", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationId}/next-stage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(applicationId);
  expect(body.status).toBe("interview");
});

test("next stage offer", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationId}/next-stage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(applicationId);
  expect(body.status).toBe("offer");
});

test("next stage hired", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationId}/next-stage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(applicationId);
  expect(body.status).toBe("hired");
});

test("next stage already last stage", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationId}/next-stage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.message).toBe("Application is already in the last stage");
});

test("reject application", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationToRejectId}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(applicationToRejectId);
  expect(body.status).toBe("rejected");
});

test("reject already rejected application", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationToRejectId}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.message).toBe("Application is already rejected");
});

test("next stage application not found", async () => {
  const response = await applicationsRouter.request(
    "/applications/999999/next-stage",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.message).toBe("Application not found");
});

test("reject application not found", async () => {
  const response = await applicationsRouter.request(
    "/applications/999999/reject",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.message).toBe("Application not found");
});

test("get applications unauthenticated", async () => {
  const response = await applicationsRouter.request("/applications");
  expect(response.status).toBe(401);
});

test("create application unauthenticated", async () => {
  const [job] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.posterId, posterId))
    .limit(1);
  const response = await applicationsRouter.request("/applications", {
    method: "POST",
    body: JSON.stringify({
      jobId: job.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Full resume text here",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  expect(response.status).toBe(401);
});

test("reject already hired application", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationId}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: authCookie,
      },
    },
  );
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.message).toBe("Application is already hired");
});

afterAll(() => {
  db.$client.release();
});
