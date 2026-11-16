import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { createApp } from "../create-app.js";
import { applicationsTable, jobsTable } from "../db/schema.js";
import {
  JSON_BODY_MAX_BYTES,
  RESUME_TEXT_MAX_LENGTH,
  RESUME_URL_MAX_LENGTH,
} from "../limits.js";
import {
  createSessionCookie,
  getOrCreateCandidate,
  getOrCreateRecruiter,
  testDb,
} from "./utils.js";

const app = createApp();
const candidate = await getOrCreateCandidate({
  email: "limits-candidate@example.com",
});
const recruiter = await getOrCreateRecruiter({
  email: "limits-recruiter@example.com",
});
const cookie = await createSessionCookie(candidate.id);

async function openJob(title: string) {
  const [job] = await testDb
    .insert(jobsTable)
    .values({
      title,
      status: "open",
      posterId: recruiter.id,
    })
    .returning();
  return job;
}

function apply(jobId: number, resume: string, resumeText: string) {
  return app.request("/applications", {
    method: "POST",
    body: JSON.stringify({ jobId, resume, resumeText }),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
}

test("create application accepts resume fields at their maximum length", async () => {
  const job = await openJob("Limits max");
  const resume = "u".repeat(RESUME_URL_MAX_LENGTH);
  const resumeText = "r".repeat(RESUME_TEXT_MAX_LENGTH);
  const response = await apply(job.id, resume, resumeText);
  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body.resume).toBe(resume);
  expect(body.resumeText).toBe(resumeText);
});

test("create application rejects a resume url over the maximum", async () => {
  const job = await openJob("Limits resume url");
  const response = await apply(
    job.id,
    "u".repeat(RESUME_URL_MAX_LENGTH + 1),
    "Resume",
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ success: false });
  const rows = await testDb
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.jobId, job.id));
  expect(rows).toHaveLength(0);
});

test("create application rejects resume text over the maximum", async () => {
  const job = await openJob("Limits resume text");
  const response = await apply(
    job.id,
    "https://example.com/resume.pdf",
    "r".repeat(RESUME_TEXT_MAX_LENGTH + 1),
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ success: false });
  const rows = await testDb
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.jobId, job.id));
  expect(rows).toHaveLength(0);
});

test("the server rejects a body over the byte limit", async () => {
  const response = await app.request("/applications", {
    method: "POST",
    body: "a".repeat(JSON_BODY_MAX_BYTES + 1),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
  expect(response.status).toBe(413);
  expect(await response.json()).toEqual({ message: "Payload too large" });
});

test("openapi documents the resume field limits", async () => {
  const response = await app.request("/-/docs");
  expect(response.status).toBe(200);
  const spec = await response.json();
  const schema =
    spec.paths["/applications"].post.requestBody.content["application/json"]
      .schema;
  expect(schema.properties.resume.maxLength).toBe(RESUME_URL_MAX_LENGTH);
  expect(schema.properties.resumeText.maxLength).toBe(RESUME_TEXT_MAX_LENGTH);
});
