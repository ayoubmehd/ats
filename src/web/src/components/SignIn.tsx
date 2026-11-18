import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function SignIn() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        const sessionResponse = await fetch("/auth/session", {
          credentials: "include",
        });
        const session: unknown = await sessionResponse.json();
        if (hasUser(session)) {
          window.location.replace("/");
          return;
        }
      } catch {
        // Still load CSRF so an anonymous User can start Google.
      }

      const csrfResponse = await fetch("/auth/csrf", {
        credentials: "include",
      });
      const csrf: unknown = await csrfResponse.json();
      if (
        !cancelled &&
        csrf !== null &&
        typeof csrf === "object" &&
        "csrfToken" in csrf &&
        typeof csrf.csrfToken === "string"
      ) {
        setCsrfToken(csrf.csrfToken);
      }
    }

    void prepare().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (csrfToken == null) {
    return null;
  }

  return (
    <form
      action="/auth/signin/google"
      method="post"
      aria-label="Sign in"
      className="space-y-4"
    >
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="callbackUrl" value="/" />
      <Button type="submit">Sign in with Google</Button>
    </form>
  );
}

function hasUser(session: unknown): boolean {
  return (
    session !== null &&
    typeof session === "object" &&
    "user" in session &&
    session.user != null
  );
}
