import { z } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { applicationsTable, jobsTable, usersTable } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq } from "drizzle-orm";

const app = new OpenAPIHono();

const CreateApplicationSchema = z.object({
  jobId: z.number(),
  resume: z.string(),
  resumeText: z.string(),
});

const ApplicationSchema = z.object({
  id: z.number(),
  jobId: z.number().nullable(),
  candidateId: z.number().nullable(),
  resume: z.string(),
  resumeText: z.string(),
  posterId: z.number().nullable(),
});

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
      description: "Get all applications for current logged inrecruiter",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
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
  const sq = db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.posterId, user.id))
    .as("sq");
  const result = await db
    .select()
    .from(applicationsTable)
    .where(eq(sq.posterId, user.id))
    .leftJoin(sq, eq(applicationsTable.jobId, sq.id));

  return c.json(
    result.map((application) => ({
      id: application.applications.id,
      jobId: application.applications.jobId,
      candidateId: application.applications.candidateId,
      resume: application.applications.resume ?? "",
      resumeText: application.applications.resumeText ?? "",
      posterId: application.sq?.posterId ?? null,
    })),
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
    200: {
      content: {
        "application/json": {
          schema: ApplicationSchema,
        },
      },
      description: "Create a new application",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: "Candidate not found",
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
  const [application] = await db
    .insert(applicationsTable)
    .values({
      jobId,
      candidateId: user.id,
      resume,
      resumeText,
    })
    .returning();
  return c.json(
    {
      id: application.id,
      jobId: application.jobId,
      candidateId: application.candidateId,
      resume: application.resume ?? "",
      resumeText: application.resumeText ?? "",
      posterId: null,
    },
    200,
  );
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
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: "Application not found",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: "Application is already in the last stage",
    },
  },
});

app.openapi(nextStageRoute, async (c) => {
  const { id } = c.req.valid("param");
  const [application] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, id));

  const currentStage = application.status;
  type ApplicationStatus = typeof applicationsTable.status.enumValues;
  let nextStage: ApplicationStatus[number] = currentStage;

  if (!application) {
    return c.json(
      {
        message: "Application not found",
      },
      404,
    );
  }

  switch (currentStage) {
    case "applied":
      nextStage = "screening";
      break;
    case "screening":
      nextStage = "interview";
      break;
    case "interview":
      nextStage = "offer";
      break;
    case "offer":
      nextStage = "hired";
      break;
    default:
      return c.json(
        {
          message: "Application is already in the last stage",
        },
        400,
      );
  }
  const [updatedApplication] = await db
    .update(applicationsTable)
    .set({ status: nextStage })
    .where(eq(applicationsTable.id, id))
    .returning();

  return c.json(
    {
      id: updatedApplication.id,
      jobId: updatedApplication.jobId,
      candidateId: updatedApplication.candidateId,
      resume: updatedApplication.resume ?? "",
      resumeText: updatedApplication.resumeText ?? "",
      status: updatedApplication.status,
      posterId: null,
    },
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
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: "Application not found",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: "Application is already rejected",
    },
  },
});

app.openapi(rejectApplicationRoute, async (c) => {
  const { id } = c.req.valid("param");
  const [application] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, id));

  if (!application) {
    return c.json(
      {
        message: "Application not found",
      },
      404,
    );
  }

  if (application.status === "rejected") {
    return c.json(
      {
        message: "Application is already rejected",
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
    {
      id: updatedApplication.id,
      jobId: updatedApplication.jobId,
      candidateId: updatedApplication.candidateId,
      resume: updatedApplication.resume ?? "",
      resumeText: updatedApplication.resumeText ?? "",
      status: updatedApplication.status,
      posterId: null,
    },
    200,
  );
});

export { app as applicationsRouter };
