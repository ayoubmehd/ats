import { z } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { applicationsTable, jobsTable } from "../db/schema.js";
import { db } from "../db/connection.js";
import { and, eq, isNull } from "drizzle-orm";
import { verifyAuth } from "../auth.js";
import { decide, resolveCaller } from "../authorization.js";
import type { ApplicationListAllow, JobRecord } from "../authorization.js";

const app = new OpenAPIHono();

app.use("/applications", verifyAuth());
app.use("/applications/:id/next-stage", verifyAuth());
app.use("/applications/:id/reject", verifyAuth());

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
  candidateId: z.string().nullable(),
  resume: z.string(),
  resumeText: z.string(),
  status: ApplicationStatusSchema,
  posterId: z.string().nullable(),
});

const MessageSchema = z.object({
  message: z.string(),
});

function messageResponse(description: string) {
  return {
    content: {
      "application/json": {
        schema: MessageSchema,
      },
    },
    description,
  };
}

const NEXT_STAGE = {
  applied: "screening",
  screening: "interview",
  interview: "offer",
  offer: "hired",
} as const;

type Application = typeof applicationsTable.$inferSelect;

function toApplicationResponse(
  application: Application,
  posterId: string | null,
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

async function findJob(id: number) {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  return job ?? null;
}

async function findApplication(id: number) {
  const [row] = await db
    .select({
      application: applicationsTable,
      jobId: jobsTable.id,
      jobStatus: jobsTable.status,
      jobPosterId: jobsTable.posterId,
      jobDeletedAt: jobsTable.deletedAt,
    })
    .from(applicationsTable)
    .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .where(eq(applicationsTable.id, id));
  if (!row) {
    return null;
  }
  const job: JobRecord | null =
    row.jobId == null || row.jobStatus == null
      ? null
      : {
          status: row.jobStatus,
          posterId: row.jobPosterId,
          deletedAt: row.jobDeletedAt,
        };
  return {
    application: row.application,
    job,
    posterId: row.jobPosterId,
  };
}

function applicationsWhere(decision: ApplicationListAllow) {
  const liveApplication = isNull(applicationsTable.deletedAt);
  if (decision.scope === "global") {
    return liveApplication;
  }
  if (decision.scope === "own_jobs") {
    return and(
      liveApplication,
      eq(jobsTable.posterId, decision.posterId),
      isNull(jobsTable.deletedAt),
    );
  }
  return and(
    liveApplication,
    eq(applicationsTable.candidateId, decision.candidateId),
    isNull(jobsTable.deletedAt),
  );
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
      description: "List applications visible to the caller",
    },
    401: messageResponse("Unauthorized"),
  },
});

app.openapi(getApplicationsRoute, async (c) => {
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const decision = decide(caller, { resource: "application", action: "list" });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const result = await db
    .select({
      application: applicationsTable,
      posterId: jobsTable.posterId,
    })
    .from(applicationsTable)
    .innerJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .where(applicationsWhere(decision));

  return c.json(
    result.map(({ application, posterId }) =>
      toApplicationResponse(application, posterId),
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
    400: messageResponse("Job is not open for applications"),
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
    404: messageResponse("Job not found"),
  },
});

app.openapi(createApplicationRoute, async (c) => {
  const { jobId, resume, resumeText } = await c.req.valid("json");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const job = await findJob(jobId);
  const decision = decide(caller, {
    resource: "application",
    action: "apply",
    job,
  });
  if (decision.outcome === "unauthenticated" || caller.kind !== "user") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (decision.outcome === "not_found" || !job) {
    return c.json({ message: "Job not found" }, 404);
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
      candidateId: caller.id,
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
    400: messageResponse("Application is already hired or rejected"),
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
    404: messageResponse("Application not found"),
  },
});

app.openapi(nextStageRoute, async (c) => {
  const { id } = c.req.valid("param");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const row = await findApplication(id);
  const decision = decide(caller, {
    resource: "application",
    action: "advance",
    application: row ? { deletedAt: row.application.deletedAt } : null,
    job: row?.job ?? null,
  });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (decision.outcome === "not_found" || !row) {
    return c.json({ message: "Application not found" }, 404);
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

  return c.json(toApplicationResponse(updatedApplication, row.posterId), 200);
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
    400: messageResponse("Application is already hired or rejected"),
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
    404: messageResponse("Application not found"),
  },
});

app.openapi(rejectApplicationRoute, async (c) => {
  const { id } = c.req.valid("param");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const row = await findApplication(id);
  const decision = decide(caller, {
    resource: "application",
    action: "reject",
    application: row ? { deletedAt: row.application.deletedAt } : null,
    job: row?.job ?? null,
  });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (decision.outcome === "not_found" || !row) {
    return c.json({ message: "Application not found" }, 404);
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

  return c.json(toApplicationResponse(updatedApplication, row.posterId), 200);
});

export { app as applicationsRouter };
