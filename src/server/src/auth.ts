import { getAuthUser, verifyAuth as verifySession } from "@hono/auth-js";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const authUser = await getAuthUser(c);
  if (authUser) {
    c.set("authUser", authUser);
  }
  await next();
};

export function verifyAuth(): MiddlewareHandler {
  const authenticate = verifySession();
  return async (c, next) => {
    try {
      await authenticate(c, next);
    } catch (error) {
      if (error instanceof HTTPException && error.status === 401) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      throw error;
    }
  };
}
