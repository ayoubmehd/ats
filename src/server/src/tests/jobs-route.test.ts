import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../db/connection.js";
import { jobsTable } from "../db/schema.js";
import { jobsRouter as jobsRouterBase } from "../routes/jobs.js";
import { test, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  createSessionCookie,
  getOrCreateRecruiter,
  getOrCreateUser,
  withAuth,
} from "./utils.js";
const client = await pool.connect();
const db = drizzle(client);

const jobsRouter = withAuth(jobsRouterBase);

let posterId: string;
let authCookie: string;

beforeAll(async () => {
  const recruiter = await getOrCreateRecruiter({
    email: "jobs-recruiter@example.com",
  });
  posterId = recruiter.id;
  authCookie = await createSessionCookie(posterId);
  await db.insert(jobsTable).values({
    title: "Software Engineer",
    summary: "A great opportunity",
    content: "Full job description here",
    status: "open",
    posterId,
  });
});

test("get jobs", async () => {
  const response = await jobsRouter.request("/jobs", {
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
      Cookie: authCookie,
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
  const response = await jobsRouter.request(`/jobs/${lastJobId}`, {
    headers: {
      Cookie: authCookie,
    },
  });
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
      Cookie: authCookie,
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
    headers: {
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Job deleted successfully");
});

test("get deleted job", async () => {
  const response = await jobsRouter.request(`/jobs/${lastJobId}`, {
    headers: {
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Job not found");
});

test("anonymous job list returns open jobs only", async () => {
  const poster = await getOrCreateRecruiter({
    email: "jobs-open-only@example.com",
  });
  const [openJob] = await db
    .insert(jobsTable)
    .values({
      title: "Open listing",
      status: "open",
      posterId: poster.id,
    })
    .returning();
  const [closedJob] = await db
    .insert(jobsTable)
    .values({
      title: "Closed listing",
      status: "closed",
      posterId: poster.id,
    })
    .returning();
  const [draftJob] = await db
    .insert(jobsTable)
    .values({
      title: "Draft listing",
      status: "draft",
      posterId: poster.id,
    })
    .returning();
  const [deletedJob] = await db
    .insert(jobsTable)
    .values({
      title: "Deleted listing",
      status: "open",
      posterId: poster.id,
      deletedAt: new Date(),
    })
    .returning();

  const response = await jobsRouter.request("/jobs");
  expect(response.status).toBe(200);
  const body: { id: number }[] = await response.json();
  const ids = body.map((job) => job.id);
  expect(ids).toContain(openJob.id);
  expect(ids).not.toContain(closedJob.id);
  expect(ids).not.toContain(draftJob.id);
  expect(ids).not.toContain(deletedJob.id);
});

test("soft-deleted recruiter lists jobs as anonymous", async () => {
  const recruiter = await getOrCreateUser({
    email: "deleted-jobs-recruiter@example.com",
    name: "Deleted Jobs Recruiter",
    role: "recruiter",
    deletedAt: new Date(),
  });
  const [draftJob] = await db
    .insert(jobsTable)
    .values({
      title: "Deleted recruiter draft",
      status: "draft",
      posterId: recruiter.id,
    })
    .returning();
  const [openJob] = await db
    .insert(jobsTable)
    .values({
      title: "Still open",
      status: "open",
      posterId: posterId,
    })
    .returning();
  const cookie = await createSessionCookie(recruiter.id);
  const response = await jobsRouter.request("/jobs", {
    headers: { Cookie: cookie },
  });
  expect(response.status).toBe(200);
  const body: { id: number }[] = await response.json();
  const ids = body.map((job) => job.id);
  expect(ids).toContain(openJob.id);
  expect(ids).not.toContain(draftJob.id);
});

test("recruiter job list is own jobs plus other open jobs", async () => {
  const recruiter = await getOrCreateUser({
    email: "scope-recruiter@example.com",
    name: "Scope Recruiter",
    role: "recruiter",
  });
  const other = await getOrCreateUser({
    email: "other-scope-recruiter@example.com",
    name: "Other Scope Recruiter",
    role: "recruiter",
  });
  const [ownDraft] = await db
    .insert(jobsTable)
    .values({ title: "Own draft", status: "draft", posterId: recruiter.id })
    .returning();
  const [ownClosed] = await db
    .insert(jobsTable)
    .values({ title: "Own closed", status: "closed", posterId: recruiter.id })
    .returning();
  const [otherOpen] = await db
    .insert(jobsTable)
    .values({ title: "Other open", status: "open", posterId: other.id })
    .returning();
  const [otherDraft] = await db
    .insert(jobsTable)
    .values({ title: "Other draft", status: "draft", posterId: other.id })
    .returning();
  const [deletedJob] = await db
    .insert(jobsTable)
    .values({
      title: "Deleted open",
      status: "open",
      posterId: recruiter.id,
      deletedAt: new Date(),
    })
    .returning();
  const cookie = await createSessionCookie(recruiter.id);
  const response = await jobsRouter.request("/jobs", {
    headers: { Cookie: cookie },
  });
  expect(response.status).toBe(200);
  const body: { id: number }[] = await response.json();
  const ids = body.map((job) => job.id);
  expect(ids).toContain(ownDraft.id);
  expect(ids).toContain(ownClosed.id);
  expect(ids).toContain(otherOpen.id);
  expect(ids).not.toContain(otherDraft.id);
  expect(ids).not.toContain(deletedJob.id);
});

test("admin job list includes every live job", async () => {
  const recruiter = await getOrCreateRecruiter({
    email: "admin-list-recruiter@example.com",
  });
  const admin = await getOrCreateUser({
    email: "jobs-admin@example.com",
    name: "Jobs Admin",
    role: "admin",
  });
  const [draftJob] = await db
    .insert(jobsTable)
    .values({ title: "Admin sees draft", status: "draft", posterId: recruiter.id })
    .returning();
  const [closedJob] = await db
    .insert(jobsTable)
    .values({
      title: "Admin sees closed",
      status: "closed",
      posterId: recruiter.id,
    })
    .returning();
  const [deletedJob] = await db
    .insert(jobsTable)
    .values({
      title: "Admin misses deleted",
      status: "open",
      posterId: recruiter.id,
      deletedAt: new Date(),
    })
    .returning();
  const cookie = await createSessionCookie(admin.id);
  const response = await jobsRouter.request("/jobs", {
    headers: { Cookie: cookie },
  });
  expect(response.status).toBe(200);
  const body: { id: number }[] = await response.json();
  const ids = body.map((job) => job.id);
  expect(ids).toContain(draftJob.id);
  expect(ids).toContain(closedJob.id);
  expect(ids).not.toContain(deletedJob.id);
});

test("anonymous read of a draft job is forbidden", async () => {
  const [draftJob] = await db
    .insert(jobsTable)
    .values({ title: "Hidden draft", status: "draft", posterId })
    .returning();
  const response = await jobsRouter.request(`/jobs/${draftJob.id}`);
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ message: "Forbidden" });
});

test("recruiter cannot read another recruiter's draft", async () => {
  const other = await getOrCreateRecruiter({
    email: "draft-owner@example.com",
  });
  const [draftJob] = await db
    .insert(jobsTable)
    .values({ title: "Someone else's draft", status: "draft", posterId: other.id })
    .returning();
  const response = await jobsRouter.request(`/jobs/${draftJob.id}`, {
    headers: { Cookie: authCookie },
  });
  expect(response.status).toBe(403);
});

test("anonymous delete of a missing job is unauthorized", async () => {
  const response = await jobsRouter.request("/jobs/999999", {
    method: "DELETE",
  });
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ message: "Unauthorized" });
});

test("soft-deleted recruiter cannot create a job", async () => {
  const recruiter = await getOrCreateUser({
    email: "deleted-poster@example.com",
    name: "Deleted Poster",
    role: "recruiter",
    deletedAt: new Date(),
  });
  const cookie = await createSessionCookie(recruiter.id);
  const title = "Should not be inserted";
  const response = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({ title }),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
  expect(response.status).toBe(401);
  const rows = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.title, title));
  expect(rows).toHaveLength(0);
});

test("candidate cannot update a missing job", async () => {
  const candidate = await getOrCreateUser({
    email: "job-candidate@example.com",
    name: "Job Candidate",
    role: "candidate",
  });
  const cookie = await createSessionCookie(candidate.id);
  const response = await jobsRouter.request("/jobs/999999", {
    method: "PUT",
    body: JSON.stringify({ title: "Nope" }),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
  expect(response.status).toBe(403);
});

test("recruiter cannot update another recruiter's job", async () => {
  const other = await getOrCreateRecruiter({
    email: "job-owner@example.com",
  });
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Owned elsewhere",
      status: "open",
      posterId: other.id,
    })
    .returning();
  const response = await jobsRouter.request(`/jobs/${job.id}`, {
    method: "PUT",
    body: JSON.stringify({ title: "Taken over" }),
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(403);
  const [row] = await db.select().from(jobsTable).where(eq(jobsTable.id, job.id));
  expect(row.title).toBe("Owned elsewhere");
});

test("admin can update another recruiter's job", async () => {
  const other = await getOrCreateRecruiter({
    email: "admin-update-owner@example.com",
  });
  const admin = await getOrCreateUser({
    email: "job-updater-admin@example.com",
    name: "Job Updater",
    role: "admin",
  });
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Before admin update",
      summary: "Before",
      status: "open",
      posterId: other.id,
    })
    .returning();
  const cookie = await createSessionCookie(admin.id);
  const response = await jobsRouter.request(`/jobs/${job.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: "After admin update",
      summary: "After",
      status: "closed",
      posterId: other.id,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.title).toBe("After admin update");
  expect(body.summary).toBe("After");
  expect(body.status).toBe("closed");
  expect(body.posterId).toBe(other.id);
});

test("recruiter create ignores a posterId in the body", async () => {
  const other = await getOrCreateRecruiter({
    email: "spoofed-poster@example.com",
  });
  const response = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Posted as self",
      posterId: other.id,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body.posterId).toBe(posterId);
});

async function adminCookie() {
  const admin = await getOrCreateUser({
    email: "poster-admin@example.com",
    name: "Poster Admin",
    role: "admin",
  });
  return createSessionCookie(admin.id);
}

test("admin create rejects an unknown poster", async () => {
  const response = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Unknown poster",
      posterId: "missing-poster",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: await adminCookie(),
    },
  });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: "Poster not found" });
  const rows = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.title, "Unknown poster"));
  expect(rows).toHaveLength(0);
});

test("admin create rejects an empty poster id", async () => {
  const response = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Empty poster",
      posterId: "",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: await adminCookie(),
    },
  });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: "Poster not found" });
  const rows = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.title, "Empty poster"));
  expect(rows).toHaveLength(0);
});

test("admin create rejects a candidate poster", async () => {
  const candidate = await getOrCreateUser({
    email: "poster-candidate@example.com",
    name: "Poster Candidate",
    role: "candidate",
  });
  const response = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Candidate poster",
      posterId: candidate.id,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: await adminCookie(),
    },
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    message: "Poster must be a recruiter or admin",
  });
  const rows = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.title, "Candidate poster"));
  expect(rows).toHaveLength(0);
});

test("admin create rejects a soft-deleted poster", async () => {
  const deleted = await getOrCreateUser({
    email: "deleted-poster@example.com",
    name: "Deleted Poster",
    role: "recruiter",
    deletedAt: new Date(),
  });
  const response = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Deleted poster",
      posterId: deleted.id,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: await adminCookie(),
    },
  });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: "Poster not found" });
  const rows = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.title, "Deleted poster"));
  expect(rows).toHaveLength(0);
});

test("admin create accepts a recruiter or admin poster", async () => {
  const recruiter = await getOrCreateRecruiter({
    email: "assigned-poster@example.com",
  });
  const admin = await getOrCreateUser({
    email: "poster-admin@example.com",
    name: "Poster Admin",
    role: "admin",
  });
  const cookie = await createSessionCookie(admin.id);
  const recruiterResponse = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Assigned recruiter",
      posterId: recruiter.id,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
  expect(recruiterResponse.status).toBe(201);
  expect((await recruiterResponse.json()).posterId).toBe(recruiter.id);

  const adminResponse = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Assigned admin",
      posterId: admin.id,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
  expect(adminResponse.status).toBe(201);
  expect((await adminResponse.json()).posterId).toBe(admin.id);
});

test("admin create allows omitting posterId", async () => {
  const response = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Unassigned job",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: await adminCookie(),
    },
  });
  expect(response.status).toBe(201);
  expect((await response.json()).posterId).toBeNull();
});

test("admin update rejects a candidate poster and leaves the job unchanged", async () => {
  const candidate = await getOrCreateUser({
    email: "poster-candidate@example.com",
    name: "Poster Candidate",
    role: "candidate",
  });
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Keep recruiter poster",
      status: "open",
      posterId,
    })
    .returning();
  const response = await jobsRouter.request(`/jobs/${job.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: "Changed title",
      posterId: candidate.id,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: await adminCookie(),
    },
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    message: "Poster must be a recruiter or admin",
  });
  const [row] = await db.select().from(jobsTable).where(eq(jobsTable.id, job.id));
  expect(row.title).toBe("Keep recruiter poster");
  expect(row.posterId).toBe(posterId);
});

test("admin update rejects an unknown poster and leaves the job unchanged", async () => {
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Keep unknown poster",
      status: "open",
      posterId,
    })
    .returning();
  const response = await jobsRouter.request(`/jobs/${job.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: "Changed title",
      posterId: "missing-poster",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: await adminCookie(),
    },
  });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: "Poster not found" });
  const [row] = await db.select().from(jobsTable).where(eq(jobsTable.id, job.id));
  expect(row.title).toBe("Keep unknown poster");
  expect(row.posterId).toBe(posterId);
});

test("admin update rejects a soft-deleted poster and leaves the job unchanged", async () => {
  const deleted = await getOrCreateUser({
    email: "deleted-poster@example.com",
    name: "Deleted Poster",
    role: "recruiter",
    deletedAt: new Date(),
  });
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Keep deleted poster",
      status: "open",
      posterId,
    })
    .returning();
  const response = await jobsRouter.request(`/jobs/${job.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: "Changed title",
      posterId: deleted.id,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: await adminCookie(),
    },
  });
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: "Poster not found" });
  const [row] = await db.select().from(jobsTable).where(eq(jobsTable.id, job.id));
  expect(row.title).toBe("Keep deleted poster");
  expect(row.posterId).toBe(posterId);
});

test("recruiter update keeps the poster when posterId is omitted", async () => {
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Poster stays",
      status: "draft",
      posterId,
    })
    .returning();
  const response = await jobsRouter.request(`/jobs/${job.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: "Poster stayed",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.title).toBe("Poster stayed");
  expect(body.posterId).toBe(posterId);
});

test("recruiter update rejects a candidate poster", async () => {
  const candidate = await getOrCreateUser({
    email: "poster-candidate@example.com",
    name: "Poster Candidate",
    role: "candidate",
  });
  const [job] = await db
    .insert(jobsTable)
    .values({
      title: "Recruiter keeps poster",
      status: "open",
      posterId,
    })
    .returning();
  const response = await jobsRouter.request(`/jobs/${job.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: "Should not change",
      posterId: candidate.id,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    message: "Poster must be a recruiter or admin",
  });
  const [row] = await db.select().from(jobsTable).where(eq(jobsTable.id, job.id));
  expect(row.title).toBe("Recruiter keeps poster");
  expect(row.posterId).toBe(posterId);
});
