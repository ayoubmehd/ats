import { z } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { jobsTable, usersTable } from "../db/schema.js";
import { db } from "../db/connection.js";
import { and, eq, isNull, or } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { optionalAuth, verifyAuth } from "../auth.js";
import { decide, resolveCaller } from "../authorization.js";
import type { JobListAllow } from "../authorization.js";

const app = new OpenAPIHono();

const authorizeJob: MiddlewareHandler = async (c, next) => {
  if (c.req.method === "GET" && isJobReadPath(c.req.path)) {
    return optionalAuth(c, next);
  }
  return verifyAuth()(c, next);
};

app.use("/jobs", authorizeJob);
app.use("/jobs/:id", authorizeJob);

function isJobReadPath(path: string) {
  return path === "/jobs" || /^\/jobs\/[^/]+$/.test(path);
}

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

const JobStatusSchema = z.enum(["open", "closed", "draft"]);

const CreateJobSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  content: z.string().optional(),
  status: JobStatusSchema.optional(),
  posterId: z.string().optional(),
});

const UpdateJobSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  content: z.string().optional(),
  status: JobStatusSchema.optional(),
  posterId: z.string().optional(),
});

const JobSchema = z
  .object({
    id: z.number().openapi({
      example: 1,
    }),
    title: z.string().openapi({
      example: "Software Engineer",
    }),
    summary: z.string().nullable().openapi({
      example: "A great opportunity",
    }),
    content: z.string().nullable().openapi({
      example: "Full job description here",
    }),
    status: JobStatusSchema.openapi({
      example: "open",
    }),
    posterId: z.string().nullable().openapi({
      example: 1,
    }),
  })
  .openapi("Job");

function toJobResponse(job: typeof jobsTable.$inferSelect) {
  return {
    id: job.id,
    title: job.title,
    summary: job.summary,
    content: job.content,
    status: job.status,
    posterId: job.posterId,
  };
}

async function findJob(id: number) {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  return job ?? null;
}

async function posterRejection(posterId: string) {
  const [poster] = await db
    .select({
      role: usersTable.role,
      deletedAt: usersTable.deletedAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, posterId));
  if (!poster || poster.deletedAt) {
    return { status: 404 as const, message: "Poster not found" as const };
  }
  if (poster.role !== "recruiter" && poster.role !== "admin") {
    return {
      status: 400 as const,
      message: "Poster must be a recruiter or admin" as const,
    };
  }
  return null;
}

function jobsListWhere(decision: JobListAllow) {
  const live = isNull(jobsTable.deletedAt);
  if (decision.scope === "open_only") {
    return and(live, eq(jobsTable.status, "open"));
  }
  if (decision.scope === "own_and_open") {
    return and(
      live,
      or(
        eq(jobsTable.posterId, decision.posterId),
        eq(jobsTable.status, "open"),
      ),
    );
  }
  return live;
}

export const getJobsRoute = createRoute({
  method: "get",
  path: "/jobs",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(JobSchema),
        },
      },
      description: "Get all jobs",
    },
  },
});

app.openapi(getJobsRoute, async (c) => {
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const decision = decide(caller, { resource: "job", action: "list" });
  const jobs = await db.select().from(jobsTable).where(jobsListWhere(decision));
  return c.json(jobs.map(toJobResponse), 200);
});

export const getJobRoute = createRoute({
  method: "get",
  path: "/jobs/{id}",
  request: {
    params: z.object({
      id: z.coerce.number().openapi({
        example: 1,
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: JobSchema,
        },
      },
      description: "Get a job by id",
    },
    403: messageResponse("Forbidden"),
    404: messageResponse("Job not found"),
  },
});

app.openapi(getJobRoute, async (c) => {
  const { id } = c.req.valid("param");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const job = await findJob(id);
  const decision = decide(caller, { resource: "job", action: "read", job });
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (decision.outcome === "not_found" || !job) {
    return c.json({ message: "Job not found" }, 404);
  }
  return c.json(toJobResponse(job), 200);
});

export const createJobRoute = createRoute({
  method: "post",
  path: "/jobs",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateJobSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: JobSchema,
        },
      },
      description: "Job created successfully",
    },
    400: messageResponse("Poster must be a recruiter or admin"),
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
    404: messageResponse("Poster not found"),
  },
});

app.openapi(createJobRoute, async (c) => {
  const { title, summary, content, status, posterId } =
    await c.req.valid("json");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const decision = decide(caller, { resource: "job", action: "create" });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }

  const resolvedPosterId =
    decision.posterSource === "caller" ? decision.posterId : posterId;
  if (decision.posterSource === "body" && resolvedPosterId !== undefined) {
    const rejection = await posterRejection(resolvedPosterId);
    if (rejection?.status === 404) {
      return c.json({ message: "Poster not found" }, 404);
    }
    if (rejection) {
      return c.json({ message: "Poster must be a recruiter or admin" }, 400);
    }
  }

  const [job] = await db
    .insert(jobsTable)
    .values({
      title,
      summary,
      content,
      status,
      posterId: resolvedPosterId,
    })
    .returning();

  return c.json(toJobResponse(job), 201);
});

export const updateJobRoute = createRoute({
  method: "put",
  path: "/jobs/{id}",
  request: {
    params: z.object({
      id: z.coerce.number().openapi({
        example: 1,
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateJobSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: JobSchema,
        },
      },
      description: "Job updated successfully",
    },
    400: messageResponse("Poster must be a recruiter or admin"),
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
    404: messageResponse("Job or poster not found"),
  },
});

app.openapi(updateJobRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { title, summary, content, status, posterId } =
    await c.req.valid("json");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const job = await findJob(id);
  const decision = decide(caller, { resource: "job", action: "update", job });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (decision.outcome === "not_found" || !job) {
    return c.json({ message: "Job not found" }, 404);
  }
  if (posterId !== undefined) {
    const rejection = await posterRejection(posterId);
    if (rejection?.status === 404) {
      return c.json({ message: "Poster not found" }, 404);
    }
    if (rejection) {
      return c.json({ message: "Poster must be a recruiter or admin" }, 400);
    }
  }

  const [updatedJob] = await db
    .update(jobsTable)
    .set({
      title,
      summary,
      content,
      status,
      ...(posterId === undefined ? {} : { posterId }),
    })
    .where(eq(jobsTable.id, id))
    .returning();

  return c.json(toJobResponse(updatedJob), 200);
});

export const deleteJobRoute = createRoute({
  method: "delete",
  path: "/jobs/{id}",
  request: {
    params: z.object({
      id: z.coerce.number().openapi({
        example: 1,
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: MessageSchema,
        },
      },
      description: "Job deleted successfully",
    },
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
    404: messageResponse("Job not found"),
  },
});

app.openapi(deleteJobRoute, async (c) => {
  const { id } = c.req.valid("param");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const job = await findJob(id);
  const decision = decide(caller, { resource: "job", action: "delete", job });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (decision.outcome === "not_found" || !job) {
    return c.json({ message: "Job not found" }, 404);
  }
  await db
    .update(jobsTable)
    .set({ deletedAt: new Date() })
    .where(eq(jobsTable.id, id));
  return c.json(
    {
      message: "Job deleted successfully",
    },
    200,
  );
});

export { app as jobsRouter };
