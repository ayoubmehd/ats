import { z } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { jobsTable } from "../db/schema.js";
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
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
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

  const [job] = await db
    .insert(jobsTable)
    .values({
      title,
      summary,
      content,
      status,
      posterId: decision.posterSource === "caller" ? decision.posterId : posterId,
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
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
    404: messageResponse("Job not found"),
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

  const [updatedJob] = await db
    .update(jobsTable)
    .set({
      title,
      summary,
      content,
      status,
      posterId,
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
