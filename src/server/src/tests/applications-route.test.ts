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
  getOrCreateUser,
  withAuth,
} from "./utils.js";

const client = await pool.connect();
const db = drizzle(client);

const applicationsRouter = withAuth(applicationsRouterBase);

let posterId: string;
let applicationToRejectId: number;
let userAuthCookie: string;
let candidateAuthCookie: string;
const candidate = await getOrCreateCandidate({
  email: "candidate@example.com",
});

beforeAll(async () => {
  const user = await getOrCreateRecruiter({ email: "recruiter@example.com" });
  posterId = user.id;
  userAuthCookie = await createSessionCookie(user.id);
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
      Cookie: userAuthCookie,
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
  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBeDefined();
  applicationId = body.id;
  expect(body.jobId).toBe(jobId);
  expect(body.candidateId).toBeDefined();
  expect(body.candidateId).toBe(candidate.id);
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
      Cookie: candidateAuthCookie,
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
      Cookie: candidateAuthCookie,
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
        Cookie: userAuthCookie,
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
        Cookie: userAuthCookie,
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
        Cookie: userAuthCookie,
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
        Cookie: userAuthCookie,
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
        Cookie: userAuthCookie,
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
        Cookie: userAuthCookie,
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
        Cookie: userAuthCookie,
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
        Cookie: userAuthCookie,
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
  const response = await applicationsRouter.request("/applications", {
    headers: {
      Cookie: userAuthCookie,
    },
  });
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
        Cookie: userAuthCookie,
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
        Cookie: userAuthCookie,
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
  expect(await response.json()).toEqual({ message: "Unauthorized" });
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
        Cookie: userAuthCookie,
      },
    },
  );
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.message).toBe("Application is already hired");
});

test("candidate application list is their apps on live jobs", async () => {
  const recruiter = await getOrCreateRecruiter({
    email: "app-list-recruiter@example.com",
  });
  const otherCandidate = await getOrCreateCandidate({
    email: "app-list-other@example.com",
  });
  const [liveJob] = await db
    .insert(jobsTable)
    .values({
      title: "Live role",
      status: "open",
      posterId: recruiter.id,
    })
    .returning();
  const [deletedJob] = await db
    .insert(jobsTable)
    .values({
      title: "Removed role",
      status: "open",
      posterId: recruiter.id,
      deletedAt: new Date(),
    })
    .returning();
  const [ownApplication] = await db
    .insert(applicationsTable)
    .values({
      jobId: liveJob.id,
      candidateId: candidate.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
      status: "applied",
    })
    .returning();
  const [otherApplication] = await db
    .insert(applicationsTable)
    .values({
      jobId: liveJob.id,
      candidateId: otherCandidate.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
      status: "applied",
    })
    .returning();
  const [deletedJobApplication] = await db
    .insert(applicationsTable)
    .values({
      jobId: deletedJob.id,
      candidateId: candidate.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
      status: "applied",
    })
    .returning();
  const response = await applicationsRouter.request("/applications", {
    headers: { Cookie: candidateAuthCookie },
  });
  expect(response.status).toBe(200);
  const body: { id: number }[] = await response.json();
  const ids = body.map((row) => row.id);
  expect(ids).toContain(ownApplication.id);
  expect(ids).not.toContain(otherApplication.id);
  expect(ids).not.toContain(deletedJobApplication.id);
});

test("admin application list includes every live application", async () => {
  const first = await getOrCreateRecruiter({
    email: "admin-apps-one@example.com",
  });
  const second = await getOrCreateRecruiter({
    email: "admin-apps-two@example.com",
  });
  const applicant = await getOrCreateCandidate({
    email: "admin-apps-candidate@example.com",
  });
  const admin = await getOrCreateUser({
    email: "applications-admin@example.com",
    name: "Applications Admin",
    role: "admin",
  });
  const [openJob] = await db
    .insert(jobsTable)
    .values({ title: "First open", status: "open", posterId: first.id })
    .returning();
  const [otherOpen] = await db
    .insert(jobsTable)
    .values({ title: "Second open", status: "open", posterId: second.id })
    .returning();
  const [closedJob] = await db
    .insert(jobsTable)
    .values({ title: "Closed", status: "closed", posterId: first.id })
    .returning();
  const [deletedJob] = await db
    .insert(jobsTable)
    .values({
      title: "Deleted",
      status: "open",
      posterId: first.id,
      deletedAt: new Date(),
    })
    .returning();
  const inserted = await db
    .insert(applicationsTable)
    .values([
      {
        jobId: openJob.id,
        candidateId: applicant.id,
        resume: "https://example.com/resume.pdf",
        resumeText: "Resume",
      },
      {
        jobId: otherOpen.id,
        candidateId: applicant.id,
        resume: "https://example.com/resume.pdf",
        resumeText: "Resume",
      },
      {
        jobId: closedJob.id,
        candidateId: applicant.id,
        resume: "https://example.com/resume.pdf",
        resumeText: "Resume",
      },
      {
        jobId: deletedJob.id,
        candidateId: applicant.id,
        resume: "https://example.com/resume.pdf",
        resumeText: "Resume",
      },
    ])
    .returning();
  const cookie = await createSessionCookie(admin.id);
  const response = await applicationsRouter.request("/applications", {
    headers: { Cookie: cookie },
  });
  expect(response.status).toBe(200);
  const body: { id: number }[] = await response.json();
  const ids = body.map((row) => row.id);
  for (const application of inserted) {
    expect(ids).toContain(application.id);
  }
});

test("recruiter application list keeps closed and draft jobs", async () => {
  const [closedJob] = await db
    .insert(jobsTable)
    .values({ title: "Own closed", status: "closed", posterId })
    .returning();
  const [draftJob] = await db
    .insert(jobsTable)
    .values({ title: "Own draft", status: "draft", posterId })
    .returning();
  const applicant = await getOrCreateCandidate({
    email: "status-apps-candidate@example.com",
  });
  const [closedApplication] = await db
    .insert(applicationsTable)
    .values({
      jobId: closedJob.id,
      candidateId: applicant.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
    })
    .returning();
  const [draftApplication] = await db
    .insert(applicationsTable)
    .values({
      jobId: draftJob.id,
      candidateId: applicant.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
    })
    .returning();
  const response = await applicationsRouter.request("/applications", {
    headers: { Cookie: userAuthCookie },
  });
  expect(response.status).toBe(200);
  const body: { id: number }[] = await response.json();
  const ids = body.map((row) => row.id);
  expect(ids).toContain(closedApplication.id);
  expect(ids).toContain(draftApplication.id);
});

test("recruiter cannot advance another recruiter's application", async () => {
  const other = await getOrCreateRecruiter({
    email: "advance-other@example.com",
  });
  const [job] = await db
    .insert(jobsTable)
    .values({ title: "Other job", status: "open", posterId: other.id })
    .returning();
  const [application] = await db
    .insert(applicationsTable)
    .values({
      jobId: job.id,
      candidateId: candidate.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
      status: "applied",
    })
    .returning();
  const response = await applicationsRouter.request(
    `/applications/${application.id}/next-stage`,
    {
      method: "POST",
      headers: { Cookie: userAuthCookie },
    },
  );
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ message: "Forbidden" });
  const [row] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, application.id));
  expect(row.status).toBe("applied");
});

test("candidate cannot reject their own application", async () => {
  const [job] = await db
    .insert(jobsTable)
    .values({ title: "Own application job", status: "open", posterId })
    .returning();
  const [application] = await db
    .insert(applicationsTable)
    .values({
      jobId: job.id,
      candidateId: candidate.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
      status: "applied",
    })
    .returning();
  const response = await applicationsRouter.request(
    `/applications/${application.id}/reject`,
    {
      method: "POST",
      headers: { Cookie: candidateAuthCookie },
    },
  );
  expect(response.status).toBe(403);
  const [row] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, application.id));
  expect(row.status).toBe("applied");
});

test("recruiter cannot advance an application on their deleted job", async () => {
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Deleted own job",
      status: "open",
      posterId,
      deletedAt: new Date(),
    })
    .returning();
  const [application] = await db
    .insert(applicationsTable)
    .values({
      jobId: job.id,
      candidateId: candidate.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
      status: "screening",
    })
    .returning();
  const response = await applicationsRouter.request(
    `/applications/${application.id}/next-stage`,
    {
      method: "POST",
      headers: { Cookie: userAuthCookie },
    },
  );
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: "Application not found" });
  const [row] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, application.id));
  expect(row.status).toBe("screening");
});

test("admin can advance an application on a deleted job", async () => {
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Deleted for admin",
      status: "open",
      posterId,
      deletedAt: new Date(),
    })
    .returning();
  const [application] = await db
    .insert(applicationsTable)
    .values({
      jobId: job.id,
      candidateId: candidate.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
      status: "applied",
    })
    .returning();
  const admin = await getOrCreateUser({
    email: "advance-admin@example.com",
    name: "Advance Admin",
    role: "admin",
  });
  const cookie = await createSessionCookie(admin.id);
  const response = await applicationsRouter.request(
    `/applications/${application.id}/next-stage`,
    {
      method: "POST",
      headers: { Cookie: cookie },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("screening");
});

test("recruiter can advance an application on their closed job", async () => {
  const [job] = await db
    .insert(jobsTable)
    .values({ title: "Closed own job", status: "closed", posterId })
    .returning();
  const [application] = await db
    .insert(applicationsTable)
    .values({
      jobId: job.id,
      candidateId: candidate.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
      status: "applied",
    })
    .returning();
  const response = await applicationsRouter.request(
    `/applications/${application.id}/next-stage`,
    {
      method: "POST",
      headers: { Cookie: userAuthCookie },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("screening");
});

test("admin cannot apply to a job", async () => {
  const [job] = await db
    .insert(jobsTable)
    .values({ title: "Admin apply", status: "open", posterId })
    .returning();
  const admin = await getOrCreateUser({
    email: "apply-admin@example.com",
    name: "Apply Admin",
    role: "admin",
  });
  const cookie = await createSessionCookie(admin.id);
  const response = await applicationsRouter.request("/applications", {
    method: "POST",
    body: JSON.stringify({
      jobId: job.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
  expect(response.status).toBe(403);
  const rows = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.jobId, job.id));
  expect(rows).toHaveLength(0);
});

test("candidate cannot apply to a soft-deleted job", async () => {
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Deleted apply",
      status: "open",
      posterId,
      deletedAt: new Date(),
    })
    .returning();
  const response = await applicationsRouter.request("/applications", {
    method: "POST",
    body: JSON.stringify({
      jobId: job.id,
      resume: "https://example.com/resume.pdf",
      resumeText: "Resume",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: candidateAuthCookie,
    },
  });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: "Job not found" });
});

test("soft-deleted candidate cannot list applications", async () => {
  const deletedCandidate = await getOrCreateUser({
    email: "deleted-applicant@example.com",
    name: "Deleted Applicant",
    role: "candidate",
    deletedAt: new Date(),
  });
  const cookie = await createSessionCookie(deletedCandidate.id);
  const response = await applicationsRouter.request("/applications", {
    headers: { Cookie: cookie },
  });
  expect(response.status).toBe(401);
});

afterAll(() => {
  db.$client.release();
});
