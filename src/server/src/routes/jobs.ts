import { z } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { jobsTable } from '../db/schema.js';
import { db } from '../db/connection.js';
import { eq } from 'drizzle-orm';

const app = new OpenAPIHono();

const JobStatusSchema = z.enum(['open', 'closed', 'draft']);

const CreateJobSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  content: z.string().optional(),
  status: JobStatusSchema.optional(),
  posterId: z.number().optional(),
});

const UpdateJobSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  content: z.string().optional(),
  status: JobStatusSchema.optional(),
  posterId: z.number().optional(),
});

const JobSchema = z.object({
  id: z.number().openapi({
    example: 1,
  }),
  title: z.string().openapi({
    example: 'Software Engineer',
  }),
  summary: z.string().nullable().openapi({
    example: 'A great opportunity',
  }),
  content: z.string().nullable().openapi({
    example: 'Full job description here',
  }),
  status: JobStatusSchema.openapi({
    example: 'open',
  }),
  posterId: z.number().nullable().openapi({
    example: 1,
  }),
}).openapi('Job');

export const getJobsRoute = createRoute({
  method: 'get',
  path: '/jobs',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(JobSchema),
        },
      },
      description: 'Get all jobs',
    },
  },
});

app.openapi(getJobsRoute, async (c) => {
  const jobs = await db.select().from(jobsTable);
  return c.json(
    jobs.map(job => ({
      id: job.id,
      title: job.title,
      summary: job.summary,
      content: job.content,
      status: job.status,
      posterId: job.posterId,
    })),
    200,
  );
});

export const getJobRoute = createRoute({
  method: 'get',
  path: '/jobs/{id}',
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
        'application/json': {
          schema: JobSchema,
        },
      },
      description: 'Get a job by id',
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: 'Job not found',
    },
  },
});

app.openapi(getJobRoute, async (c) => {
  const { id } = c.req.valid('param');
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) {
    return c.json({
      message: 'Job not found',
    }, 404);
  }
  return c.json({
    id: job.id,
    title: job.title,
    summary: job.summary,
    content: job.content,
    status: job.status,
    posterId: job.posterId,
  }, 200);
});

export const createJobRoute = createRoute({
  method: 'post',
  path: '/jobs',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateJobSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: JobSchema,
        },
      },
      description: 'Job created successfully',
    },
  },
});

app.openapi(createJobRoute, async (c) => {
  const { title, summary, content, status, posterId } = await c.req.valid('json');

  const [job] = await db.insert(jobsTable).values({
    title,
    summary,
    content,
    status,
    posterId,
  }).returning();

  return c.json({
    id: job.id,
    title: job.title,
    summary: job.summary,
    content: job.content,
    status: job.status,
    posterId: job.posterId,
  }, 201);
});

export const updateJobRoute = createRoute({
  method: 'put',
  path: '/jobs/{id}',
  request: {
    params: z.object({
      id: z.coerce.number().openapi({
        example: 1,
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateJobSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: JobSchema,
        },
      },
      description: 'Job updated successfully',
    },
  },
});

app.openapi(updateJobRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { title, summary, content, status, posterId } = await c.req.valid('json');
  const [job] = await db.update(jobsTable).set({
    title,
    summary,
    content,
    status,
    posterId,
  }).where(eq(jobsTable.id, id)).returning();
  return c.json({
    id: job.id,
    title: job.title,
    summary: job.summary,
    content: job.content,
    status: job.status,
    posterId: job.posterId,
  }, 200);
});

export const deleteJobRoute = createRoute({
  method: 'delete',
  path: '/jobs/{id}',
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
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: 'Job deleted successfully',
    },
  },
});

app.openapi(deleteJobRoute, async (c) => {
  const { id } = c.req.valid('param');
  await db.delete(jobsTable).where(eq(jobsTable.id, id));
  return c.json({
    message: 'Job deleted successfully',
  }, 200);
});

export {
  app as jobsRouter,
};
