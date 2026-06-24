import { z } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { usersTable as candidatesTable } from '../db/schema.js';
import { db } from '../db/connection.js';
import { eq } from 'drizzle-orm';

const app = new OpenAPIHono();

const CreateCandidateSchema = z.object({
  username: z.string().min(1),
  email: z.email(),
});

const UpdateCandidateSchema = z.object({
  username: z.string().min(1),
  email: z.email(),
});

const CandidateSchema = z.object({
  id: z.number().openapi({
    example: '121',
  }),
  username: z.string().openapi({
    example: 'John Doe',
  }),
  email: z.email().openapi({
    example: 'john.doe@example.com',
  }),
}).openapi("Candidate");

export const getCandidatesRoute = createRoute({
  method: 'get',
  path: '/candidates',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(CandidateSchema),
        },
      },
      description: "Get all candidates",
    },
  },
});

app.openapi(getCandidatesRoute, async (c) => {
  const candidates = await db.select().from(candidatesTable);
  return c.json(
    candidates.map(candidate => ({
      id: candidate.id,
      username: candidate.username,
      email: candidate.email,
    })
  ), 200);
});

export const getCandidateRoute = createRoute({
  method: 'get',
  path: '/candidates/{id}',
  request: {
    params: z.object({
      id: z.coerce.number().openapi({
        example: 121,
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: CandidateSchema,
        },
      },
      description: "Get a candidate by id",
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: "Candidate not found",
    },
  },
});

app.openapi(getCandidateRoute, async (c) => {
  const { id } = c.req.valid('param');
  const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, id));
  if (!candidate) {
    return c.json({
      message: 'Candidate not found',
    }, 404);
  }
  return c.json({
    id: candidate.id,
    username: candidate.username,
    email: candidate.email,
  }, 200);
});

export const createCandidateRoute = createRoute({
  method: 'post',
  path: '/candidates',
  request: {
    body: {
        content: {
            'application/json': {
                schema: CreateCandidateSchema,
            },
        },
        required: true,
    },
  },
  responses: {
    201: {
        content: {
            'application/json': {
                schema: CandidateSchema,
            }
        },
        description: 'Candidate created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Candidate already exists',
    },
  },
});

app.openapi(createCandidateRoute, async (c) => {
  const { username, email } = await c.req.valid('json');

  const existingCandidate = await db.select().from(candidatesTable).where(eq(candidatesTable.email, email));
  if (existingCandidate.length > 0) {
    return c.json({
      error: 'Candidate already exists',
    }, 400);
  }

  const [candidate] = await db.insert(candidatesTable).values({
    username,
    email
  }).returning();

  return c.json({
    id: candidate.id,
    username: candidate.username,
    email: candidate.email,
  }, 201);
});

export const updateCandidateRoute = createRoute({
  method: 'put',
  path: '/candidates/{id}',
  request: {
    params: z.object({
      id: z.coerce.number().openapi({
        example: 121,
      }),
    }),
    body: {
        content: {
            'application/json': {
                schema: UpdateCandidateSchema,
            },
        },
        required: true,
    },
  },
  responses: {
    200: {
        content: {
            'application/json': {
                schema: CandidateSchema,
            }
        },
        description: 'Candidate updated successfully',
    },
  },
});

app.openapi(updateCandidateRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { username, email } = await c.req.valid('json');
  const [candidate] = await db.update(candidatesTable).set({
    username,
    email
  }).where(eq(candidatesTable.id, id)).returning();
  return c.json({
    id: candidate.id,
    username: candidate.username,
    email: candidate.email,
  }, 200);
});

export const deleteCandidateRoute = createRoute({
  method: 'delete',
  path: '/candidates/{id}',
  request: {
    params: z.object({
      id: z.coerce.number().openapi({
        example: 121,
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
      description: 'Candidate deleted successfully',
    },
  },
});

app.openapi(deleteCandidateRoute, async (c) => {
  const { id } = c.req.valid('param');
  await db.delete(candidatesTable).where(eq(candidatesTable.id, id));
  return c.json({
    message: 'Candidate deleted successfully',
  }, 200);
});

export {
  app as candidatesRouter,
};