import { z } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { usersTable as candidatesTable } from '../db/schema.js';
import { db } from '../db/connection.js';

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
  },
});

export const updateCandidateRoute = createRoute({
  method: 'put',
  path: '/candidates/{id}',
  request: {
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
    }
  },
});

app.openapi(createCandidateRoute, async (c) => {
  const { username, email } = await c.req.valid('json');
  const [candidate] = await db.insert(candidatesTable).values({
    username,
    email
  }).returning();

  return c.json({
    id: candidate.id,
    username: candidate.username,
    email: candidate.email,
  }, 201);
})

export {
  app as candidatesRouter,
};