import { z } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { usersTable as candidatesTable } from "../db/schema.js";
import { db } from "../db/connection.js";
import { and, eq, isNull } from "drizzle-orm";
import { verifyAuth } from "../auth.js";
import { decide, resolveCaller } from "../authorization.js";
import type { CandidateListAllow } from "../authorization.js";

const app = new OpenAPIHono();

app.use("/candidates", verifyAuth());
app.use("/candidates/:id", verifyAuth());

const MessageSchema = z.object({
  message: z.string(),
});

const ErrorSchema = z.object({
  error: z.string(),
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

function errorResponse(description: string) {
  return {
    content: {
      "application/json": {
        schema: ErrorSchema,
      },
    },
    description,
  };
}

const CreateCandidateSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
});

const UpdateCandidateSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
});

const CandidateSchema = z
  .object({
    id: z.string().openapi({
      example: "121",
    }),
    name: z.string().openapi({
      example: "John Doe",
    }),
    email: z.email().openapi({
      example: "john.doe@example.com",
    }),
  })
  .openapi("Candidate");

function toCandidateResponse(candidate: {
  id: string;
  name: string;
  email: string;
}) {
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
  };
}

async function findUser(id: string) {
  const [user] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, id));
  return user ?? null;
}

function candidatesWhere(decision: CandidateListAllow) {
  if (decision.scope === "global") {
    return and(
      eq(candidatesTable.role, "candidate"),
      isNull(candidatesTable.deletedAt),
    );
  }
}

export const getCandidatesRoute = createRoute({
  method: "get",
  path: "/candidates",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(CandidateSchema),
        },
      },
      description: "Get all candidates",
    },
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
  },
});

app.openapi(getCandidatesRoute, async (c) => {
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const decision = decide(caller, { resource: "candidate", action: "list" });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }

  const candidates = await db
    .select({
      id: candidatesTable.id,
      name: candidatesTable.name,
      email: candidatesTable.email,
    })
    .from(candidatesTable)
    .where(candidatesWhere(decision));

  return c.json(candidates, 200);
});

export const getCandidateRoute = createRoute({
  method: "get",
  path: "/candidates/{id}",
  request: {
    params: z.object({
      id: z.string().openapi({
        example: "121",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: CandidateSchema,
        },
      },
      description: "Get a candidate by id",
    },
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
    404: messageResponse("Candidate not found"),
  },
});

app.openapi(getCandidateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const user = await findUser(id);
  const decision = decide(caller, { resource: "candidate", action: "read", user });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (decision.outcome === "not_found" || !user) {
    return c.json({ message: "Candidate not found" }, 404);
  }
  return c.json(toCandidateResponse(user), 200);
});

export const createCandidateRoute = createRoute({
  method: "post",
  path: "/candidates",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateCandidateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: CandidateSchema,
        },
      },
      description: "Candidate created successfully",
    },
    400: errorResponse("Candidate already exists"),
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
  },
});

app.openapi(createCandidateRoute, async (c) => {
  const { name, email } = await c.req.valid("json");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const decision = decide(caller, { resource: "candidate", action: "create" });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }

  const existing = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.email, email));
  const [only] = existing;
  if (existing.length === 1 && only.role === "candidate" && only.deletedAt) {
    const [restored] = await db
      .update(candidatesTable)
      .set({
        name,
        deletedAt: null,
      })
      .where(eq(candidatesTable.id, only.id))
      .returning({
        id: candidatesTable.id,
        name: candidatesTable.name,
        email: candidatesTable.email,
      });
    return c.json(restored, 201);
  }
  if (existing.length > 0) {
    return c.json(
      {
        error: "Candidate already exists",
      },
      400,
    );
  }

  const [candidate] = await db
    .insert(candidatesTable)
    .values({
      id: crypto.randomUUID().toString(),
      name,
      email,
    })
    .returning({
      id: candidatesTable.id,
      name: candidatesTable.name,
      email: candidatesTable.email,
    });

  return c.json(candidate, 201);
});

export const updateCandidateRoute = createRoute({
  method: "put",
  path: "/candidates/{id}",
  request: {
    params: z.object({
      id: z.string().openapi({
        example: 121,
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateCandidateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: CandidateSchema,
        },
      },
      description: "Candidate updated successfully",
    },
    400: errorResponse("Candidate already exists"),
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
    404: messageResponse("Candidate not found"),
  },
});

app.openapi(updateCandidateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { name, email } = await c.req.valid("json");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const user = await findUser(id);
  const decision = decide(caller, {
    resource: "candidate",
    action: "update",
    user,
  });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (decision.outcome === "not_found" || !user) {
    return c.json({ message: "Candidate not found" }, 404);
  }

  const taken = await db
    .select({ id: candidatesTable.id })
    .from(candidatesTable)
    .where(eq(candidatesTable.email, email));
  if (taken.some((row) => row.id !== id)) {
    return c.json(
      {
        error: "Candidate already exists",
      },
      400,
    );
  }

  const [candidate] = await db
    .update(candidatesTable)
    .set({
      name,
      email,
    })
    .where(and(eq(candidatesTable.id, id), isNull(candidatesTable.deletedAt)))
    .returning({
      id: candidatesTable.id,
      name: candidatesTable.name,
      email: candidatesTable.email,
    });
  if (!candidate) {
    return c.json({ message: "Candidate not found" }, 404);
  }
  return c.json(candidate, 200);
});

export const deleteCandidateRoute = createRoute({
  method: "delete",
  path: "/candidates/{id}",
  request: {
    params: z.object({
      id: z.string().openapi({
        example: "121",
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
      description: "Candidate deleted successfully",
    },
    401: messageResponse("Unauthorized"),
    403: messageResponse("Forbidden"),
    404: messageResponse("Candidate not found"),
  },
});

app.openapi(deleteCandidateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const caller = await resolveCaller(c.get("authUser")?.user?.id);
  const user = await findUser(id);
  const decision = decide(caller, {
    resource: "candidate",
    action: "delete",
    user,
  });
  if (decision.outcome === "unauthenticated") {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (decision.outcome === "forbidden") {
    return c.json({ message: "Forbidden" }, 403);
  }
  if (decision.outcome === "not_found" || !user) {
    return c.json({ message: "Candidate not found" }, 404);
  }
  await db
    .update(candidatesTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(candidatesTable.id, id), isNull(candidatesTable.deletedAt)));

  return c.json(
    {
      message: "Candidate deleted successfully",
    },
    200,
  );
});

export { app as candidatesRouter };
