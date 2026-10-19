import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../db/connection.js";
import { applicationsTable, jobsTable, usersTable } from "../db/schema.js";
import { applicationsRouter } from "../routes/applications.js";
import { test, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { getOrCreateCandidate, getOrCreateRecruiter } from "./utils.js";
const client = await pool.connect();
const db = drizzle(client);

let posterId: number;
let applicationToRejectId: number;

beforeAll(async () => {
  const user = await getOrCreateRecruiter({ email: "recruiter@example.com" });
  posterId = user.id;
  const candidate = await getOrCreateCandidate({
    email: "candidate@example.com",
  });
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
  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBeDefined();
  applicationId = body.id;
  expect(body.jobId).toBe(jobId);
  expect(body.candidateId).toBeDefined();
  expect(body.resume).toBe("https://example.com/resume.pdf");
  expect(body.resumeText).toBe("Full resume text here");
  expect(body.status).toBe("applied");
  expect(body.posterId).toBe(posterId);
});

test("create application job not found", async () => {
  const response = await applicationsRouter.request("/applications", {
    method: "POST",
    body: JSON.stringify({
      jobId: 999999,
      resume: "https://example.com/resume.pdf",
      resumeText: "Full resume text here",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.message).toBe("Job not found");
});

test("create application job not open", async () => {
  const [closedJob] = await db
    .insert(jobsTable)
    .values({
      title: "Closed Role",
      summary: "A great opportunity",
      content: "Full job description here",
      status: "closed",
      posterId: posterId,
    })
    .returning();
  const response = await applicationsRouter.request("/applications", {
    method: "POST",
    body: JSON.stringify({
      jobId: closedJob.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Full resume text here",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.message).toBe("Job is not open for applications");
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
  expect(body.posterId).toBe(posterId);
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
  expect(body.message).toBe("Application is already hired");
});

test("reject application", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationToRejectId}/reject`,
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
      },
    },
  );
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.message).toBe("Application is already rejected");
});

test("next stage rejected application", async () => {
  const response = await applicationsRouter.request(
    `/applications/${applicationToRejectId}/next-stage`,
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

test("get applications excludes soft-deleted jobs", async () => {
  const candidate = await getOrCreateCandidate({
    email: "candidate.2@example.com",
  });
  const [deletedJob] = await db
    .insert(jobsTable)
    .values({
      title: "Deleted Role",
      summary: "A great opportunity",
      content: "Full job description here",
      status: "open",
      posterId: posterId,
      deletedAt: new Date(),
    })
    .returning();
  await db.insert(applicationsTable).values({
    jobId: deletedJob.id,
    candidateId: candidate.id,
    resume: "https://example.com/resume.pdf",
    resumeText: "Full resume text here",
    status: "applied",
  });
  const response = await applicationsRouter.request("/applications");
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.length).toBeGreaterThan(0);
  expect(body.some((app: any) => app.jobId === deletedJob.id)).toBe(false);
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

test("reject already hired application", async () => {
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
  expect(body.message).toBe("Application is already hired");
});
