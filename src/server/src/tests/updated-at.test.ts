import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { db } from "../db/connection.js";
import {
  applicationsTable,
  jobsTable,
  usersTable,
} from "../db/schema.js";
import { applicationsRouter as applicationsRouterBase } from "../routes/applications.js";
import { candidatesRouter as candidatesRouterBase } from "../routes/candidates.js";
import { jobsRouter as jobsRouterBase } from "../routes/jobs.js";
import { createSessionCookie, getOrCreateUser, withAuth } from "./utils.js";

const jobsRouter = withAuth(jobsRouterBase);
const candidatesRouter = withAuth(candidatesRouterBase);
const applicationsRouter = withAuth(applicationsRouterBase);

const STALE = new Date("2000-01-01T00:00:00.000Z");

type StampTable =
  | typeof jobsTable
  | typeof applicationsTable
  | typeof usersTable;

async function pinUpdatedAt(table: StampTable, id: number | string) {
  const [pinned] = await db
    .update(table)
    .set({ updatedAt: STALE })
    .where(eq(table.id, id as never))
    .returning({
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    });
  expect(pinned.updatedAt.toISOString()).toBe(STALE.toISOString());
  return pinned.createdAt;
}

async function readRow(table: StampTable, id: number | string) {
  const [row] = await db
    .select({
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
      deletedAt: table.deletedAt,
    })
    .from(table)
    .where(eq(table.id, id as never));
  return row;
}

function expectTimestampsMoved(row: {
  createdAt: Date;
  updatedAt: Date;
}, createdAt: Date) {
  expect(row.updatedAt.getTime()).toBeGreaterThan(STALE.getTime());
  expect(row.createdAt.getTime()).toBe(createdAt.getTime());
}

test("updating a job refreshes updatedAt and leaves createdAt", async () => {
  const recruiter = await getOrCreateUser({
    email: `recruiter-${randomUUID()}@example.com`,
    name: "Recruiter",
    role: "recruiter",
  });
  const cookie = await createSessionCookie(recruiter.id);
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Engineer",
      summary: "Summary",
      content: "Content",
      status: "open",
      posterId: recruiter.id,
    })
    .returning();
  const createdAt = await pinUpdatedAt(jobsTable, job.id);

  const response = await jobsRouter.request(`/jobs/${job.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: "Senior Engineer",
      summary: "Updated summary",
      content: "Updated content",
      status: "closed",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });

  expect(response.status).toBe(200);
  const row = await readRow(jobsTable, job.id);
  expectTimestampsMoved(row, createdAt);
  expect(row.deletedAt).toBeNull();
});

test("deleting a job refreshes updatedAt", async () => {
  const recruiter = await getOrCreateUser({
    email: `recruiter-${randomUUID()}@example.com`,
    name: "Recruiter",
    role: "recruiter",
  });
  const cookie = await createSessionCookie(recruiter.id);
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Engineer",
      status: "draft",
      posterId: recruiter.id,
    })
    .returning();
  const createdAt = await pinUpdatedAt(jobsTable, job.id);

  const response = await jobsRouter.request(`/jobs/${job.id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });

  expect(response.status).toBe(200);
  const row = await readRow(jobsTable, job.id);
  expectTimestampsMoved(row, createdAt);
  expect(row.deletedAt).toBeInstanceOf(Date);
});

test("updating a candidate refreshes updatedAt and leaves createdAt", async () => {
  const admin = await getOrCreateUser({
    email: `admin-${randomUUID()}@example.com`,
    name: "Admin",
    role: "admin",
  });
  const cookie = await createSessionCookie(admin.id);
  const candidate = await getOrCreateUser({
    email: `candidate-${randomUUID()}@example.com`,
    name: "Candidate",
    role: "candidate",
  });
  const createdAt = await pinUpdatedAt(usersTable, candidate.id);
  const nextEmail = `candidate-${randomUUID()}@example.com`;

  const response = await candidatesRouter.request(
    `/candidates/${candidate.id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: "Updated Candidate",
        email: nextEmail,
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    },
  );

  expect(response.status).toBe(200);
  const row = await readRow(usersTable, candidate.id);
  expectTimestampsMoved(row, createdAt);
  expect(row.deletedAt).toBeNull();
});

test("deleting a candidate refreshes updatedAt", async () => {
  const admin = await getOrCreateUser({
    email: `admin-${randomUUID()}@example.com`,
    name: "Admin",
    role: "admin",
  });
  const cookie = await createSessionCookie(admin.id);
  const candidate = await getOrCreateUser({
    email: `candidate-${randomUUID()}@example.com`,
    name: "Candidate",
    role: "candidate",
  });
  const createdAt = await pinUpdatedAt(usersTable, candidate.id);

  const response = await candidatesRouter.request(
    `/candidates/${candidate.id}`,
    {
      method: "DELETE",
      headers: { Cookie: cookie },
    },
  );

  expect(response.status).toBe(200);
  const row = await readRow(usersTable, candidate.id);
  expectTimestampsMoved(row, createdAt);
  expect(row.deletedAt).toBeInstanceOf(Date);
});

test("restoring a soft-deleted candidate refreshes updatedAt", async () => {
  const admin = await getOrCreateUser({
    email: `admin-${randomUUID()}@example.com`,
    name: "Admin",
    role: "admin",
  });
  const cookie = await createSessionCookie(admin.id);
  const email = `candidate-${randomUUID()}@example.com`;
  const candidate = await getOrCreateUser({
    email,
    name: "Candidate",
    role: "candidate",
    deletedAt: new Date(),
  });
  const createdAt = await pinUpdatedAt(usersTable, candidate.id);

  const response = await candidatesRouter.request("/candidates", {
    method: "POST",
    body: JSON.stringify({
      name: "Restored Candidate",
      email,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });

  expect(response.status).toBe(201);
  const row = await readRow(usersTable, candidate.id);
  expectTimestampsMoved(row, createdAt);
  expect(row.deletedAt).toBeNull();
});

test("advancing an application refreshes updatedAt and leaves createdAt", async () => {
  const recruiter = await getOrCreateUser({
    email: `recruiter-${randomUUID()}@example.com`,
    name: "Recruiter",
    role: "recruiter",
  });
  const candidate = await getOrCreateUser({
    email: `candidate-${randomUUID()}@example.com`,
    name: "Candidate",
    role: "candidate",
  });
  const cookie = await createSessionCookie(recruiter.id);
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Engineer",
      status: "open",
      posterId: recruiter.id,
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
  const createdAt = await pinUpdatedAt(applicationsTable, application.id);

  const response = await applicationsRouter.request(
    `/applications/${application.id}/next-stage`,
    {
      method: "POST",
      headers: { Cookie: cookie },
    },
  );

  expect(response.status).toBe(200);
  const row = await readRow(applicationsTable, application.id);
  expectTimestampsMoved(row, createdAt);
});

test("rejecting an application refreshes updatedAt", async () => {
  const recruiter = await getOrCreateUser({
    email: `recruiter-${randomUUID()}@example.com`,
    name: "Recruiter",
    role: "recruiter",
  });
  const candidate = await getOrCreateUser({
    email: `candidate-${randomUUID()}@example.com`,
    name: "Candidate",
    role: "candidate",
  });
  const cookie = await createSessionCookie(recruiter.id);
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Engineer",
      status: "open",
      posterId: recruiter.id,
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
  const createdAt = await pinUpdatedAt(applicationsTable, application.id);

  const response = await applicationsRouter.request(
    `/applications/${application.id}/reject`,
    {
      method: "POST",
      headers: { Cookie: cookie },
    },
  );

  expect(response.status).toBe(200);
  const row = await readRow(applicationsTable, application.id);
  expectTimestampsMoved(row, createdAt);
});
