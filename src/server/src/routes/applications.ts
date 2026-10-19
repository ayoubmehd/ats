import { z } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { applicationsTable, jobsTable, usersTable } from "../db/schema.js";
import { db } from "../db/connection.js";
import { and, eq, isNull } from "drizzle-orm";

const app = new OpenAPIHono();

const CreateApplicationSchema = z.object({
  jobId: z.number(),
  resume: z.string(),
  resumeText: z.string(),
});

const ApplicationStatusSchema = z.enum([
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
]);

const ApplicationSchema = z.object({
  id: z.number(),
  jobId: z.number().nullable(),
  candidateId: z.number().nullable(),
  resume: z.string(),
  resumeText: z.string(),
  status: ApplicationStatusSchema,
  posterId: z.number().nullable(),
});

const MessageSchema = z.object({
  message: z.string(),
});

const NEXT_STAGE = {
  applied: "screening",
  screening: "interview",
  interview: "offer",
  offer: "hired",
} as const;

type Application = typeof applicationsTable.$inferSelect;

function toApplicationResponse(
  application: Application,
  posterId: number | null,
) {
  return {
    id: application.id,
    jobId: application.jobId,
    candidateId: application.candidateId,
    resume: application.resume ?? "",
    resumeText: application.resumeText ?? "",
    status: application.status,
    posterId,
  };
}

async function findApplicationWithPoster(id: number) {
  const [row] = await db
    .select({
      application: applicationsTable,
      posterId: jobsTable.posterId,
    })
    .from(applicationsTable)
    .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .where(
      and(eq(applicationsTable.id, id), isNull(applicationsTable.deletedAt)),
    );
  return row;
}

export const getApplicationsRoute = createRoute({
  method: "get",
  path: "/applications",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(ApplicationSchema),
        },
      },
      description: "Get all applications for current logged in recruiter",
    },
    404: {
      content: {
        "application/json": {
          schema: MessageSchema,
        },
      },
      description: "Recruiter not found",
    },
  },
});

app.openapi(getApplicationsRoute, async (c) => {
  // No auth for now, will use hardcoded email for recruiter
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, "recruiter@example.com"));
  if (!user) {
    return c.json(
      {
        message: "Recruiter not found",
      },
      404,
    );
  }
  const result = await db
    .select()
    .from(applicationsTable)
    .innerJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .where(
      and(
        eq(jobsTable.posterId, user.id),
        isNull(applicationsTable.deletedAt),
        isNull(jobsTable.deletedAt),
      ),
    );

  return c.json(
    result.map(({ applications, jobs }) =>
      toApplicationResponse(applications, jobs.posterId),
    ),
    200,
  );
});

export const createApplicationRoute = createRoute({
  method: "post",
  path: "/applications",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateApplicationSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: ApplicationSchema,
        },
      },
      description: "Create a new application",
    },
    400: {
      content: {
        "application/json": {
          schema: MessageSchema,
        },
      },
      description: "Job is not open for applications",
    },
    404: {
      content: {
        "application/json": {
          schema: MessageSchema,
        },
      },
      description: "Candidate or job not found",
    },
  },
});

app.openapi(createApplicationRoute, async (c) => {
  const envVars = process.env;

  const { jobId, resume, resumeText } = await c.req.valid("json");
  // No auth for now, will use hardcoded email for candidate
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, envVars.TEST_EMAIL ?? "jane@example.com"));
  if (!user) {
    return c.json(
      {
        message: "Candidate not found",
      },
      404,
    );
  }

  const [job] = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.id, jobId), isNull(jobsTable.deletedAt)));
  if (!job) {
    return c.json(
      {
        message: "Job not found",
      },
      404,
    );
  }
  if (job.status !== "open") {
    return c.json(
      {
        message: "Job is not open for applications",
      },
      400,
    );
  }

  const [application] = await db
    .insert(applicationsTable)
    .values({
      jobId,
      candidateId: user.id,
      resume,
      resumeText,
    })
    .returning();
  return c.json(toApplicationResponse(application, job.posterId), 201);
});

const nextStageRoute = createRoute({
  method: "post",
  path: "/applications/{id}/next-stage",
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApplicationSchema,
        },
      },
      description: "Move application to next stage",
    },
    404: {
      content: {
        "application/json": {
          schema: MessageSchema,
        },
      },
      description: "Application not found",
    },
    400: {
      content: {
        "application/json": {
          schema: MessageSchema,
        },
      },
      description: "Application is already hired or rejected",
    },
  },
});

app.openapi(nextStageRoute, async (c) => {
  const { id } = c.req.valid("param");
  const row = await findApplicationWithPoster(id);

  if (!row) {
    return c.json(
      {
        message: "Application not found",
      },
      404,
    );
  }

  const currentStage = row.application.status;

  if (currentStage === "hired" || currentStage === "rejected") {
    return c.json(
      {
        message: `Application is already ${currentStage}`,
      },
      400,
    );
  }

  const [updatedApplication] = await db
    .update(applicationsTable)
    .set({ status: NEXT_STAGE[currentStage] })
    .where(eq(applicationsTable.id, id))
    .returning();

  return c.json(
    toApplicationResponse(updatedApplication, row.posterId),
    200,
  );
});

const rejectApplicationRoute = createRoute({
  method: "post",
  path: "/applications/{id}/reject",
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ApplicationSchema,
        },
      },
      description: "Reject application",
    },
    404: {
      content: {
        "application/json": {
          schema: MessageSchema,
        },
      },
      description: "Application not found",
    },
    400: {
      content: {
        "application/json": {
          schema: MessageSchema,
        },
      },
      description: "Application is already hired or rejected",
    },
  },
});

app.openapi(rejectApplicationRoute, async (c) => {
  const { id } = c.req.valid("param");
  const row = await findApplicationWithPoster(id);

  if (!row) {
    return c.json(
      {
        message: "Application not found",
      },
      404,
    );
  }

  const currentStage = row.application.status;

  if (currentStage === "hired" || currentStage === "rejected") {
    return c.json(
      {
        message: `Application is already ${currentStage}`,
      },
      400,
    );
  }

  const [updatedApplication] = await db
    .update(applicationsTable)
    .set({ status: "rejected" })
    .where(eq(applicationsTable.id, id))
    .returning();

  return c.json(
    toApplicationResponse(updatedApplication, row.posterId),
    200,
  );
});

export { app as applicationsRouter };
