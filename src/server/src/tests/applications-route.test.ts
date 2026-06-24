import { db } from "../db/connection.js";
import { applicationsTable, jobsTable, usersTable } from "../db/schema.js";
import { applicationsRouter } from "../routes/applications.js";
import { test, expect, beforeAll, afterAll } from "vitest";
import { eq, getTableName, sql } from "drizzle-orm";
import { config } from "dotenv";
config({
  path: ".test.env",
});

let posterId: number;

beforeAll(async () => {
  await db.execute("BEGIN");
  await db.delete(applicationsTable);
  await db.delete(jobsTable);
  await db.delete(usersTable);
  const table = (t: any) => sql.identifier(getTableName(t));
  await db.execute(
    sql`TRUNCATE TABLE ${table(applicationsTable)} RESTART IDENTITY`,
  );
  await db.execute(
    sql`TRUNCATE TABLE ${table(jobsTable)} RESTART IDENTITY CASCADE`,
  );
  await db.execute(
    sql`TRUNCATE TABLE ${table(usersTable)} RESTART IDENTITY CASCADE`,
  );
  const [user] = await db
    .insert(usersTable)
    .values({
      username: "Recruiter",
      email: "recruiter@example.com",
      role: "recruiter",
    })
    .returning();
  posterId = user.id;
  const [candidate] = await db
    .insert(usersTable)
    .values({
      username: "Candidate",
      email: "candidate@example.com",
      role: "candidate",
    })
    .returning();
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
  const [otherCandidate] = await db
    .insert(usersTable)
    .values({
      username: "Candidate",
      email: "candidate.1@example.com",
      role: "candidate",
    })
    .returning();
  await db.insert(applicationsTable).values({
    jobId: job.id,
    candidateId: otherCandidate.id,
    resume: "https://example.com/resume.pdf",
    resumeText: "Full resume text here",
    status: "applied",
  });

  const [otherRecruiter] = await db
    .insert(usersTable)
    .values({
      username: "Recruiter",
      email: "recruiter.1@example.com",
      role: "recruiter",
    })
    .returning();

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
  const response = await applicationsRouter.request("/applications");
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.length).toBe(2);
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
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBeDefined();
  applicationId = body.id;
  expect(body.jobId).toBe(jobId);
  expect(body.candidateId).toBeDefined();
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
      },
    },
  );
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.message).toBe("Application is already in the last stage");
});

test("reject application", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationId}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(applicationId);
  expect(body.status).toBe("rejected");
});

test("reject already rejected application", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationId}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
      },
    },
  );
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.message).toBe("Application not found");
});

test("get applications recruiter not found", async () => {
  await db
    .update(usersTable)
    .set({ email: "missing-recruiter@example.com" })
    .where(eq(usersTable.email, "recruiter@example.com"));
  const response = await applicationsRouter.request("/applications");
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.message).toBe("Recruiter not found");
});

test("create application candidate not found", async () => {
  await db
    .update(usersTable)
    .set({ email: "missing-candidate@example.com" })
    .where(eq(usersTable.email, "candidate@example.com"));
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
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.message).toBe("Candidate not found");
});

afterAll(async () => {
  await db.execute("ROLLBACK");
});
