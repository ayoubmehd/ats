import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SignIn } from "./SignIn";
import { jsonResponse } from "@/tests/fetch";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockAuth({
  session,
  csrfToken = "csrf-from-auth",
}: {
  session: unknown;
  csrfToken?: string;
}) {
  vi.mocked(fetch).mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/auth/session")) {
      return Promise.resolve(jsonResponse(session));
    }
    if (url.includes("/auth/csrf")) {
      return Promise.resolve(jsonResponse({ csrfToken }));
    }
    return Promise.reject(new Error(`unexpected fetch ${url}`));
  });
}

test("POSTs to Google sign-in with the CSRF token and list callbackUrl", async () => {
  mockAuth({ session: null });

  render(<SignIn />);

  const form = await screen.findByRole("form", { name: "Sign in" });
  expect(form).toHaveAttribute("action", "/auth/signin/google");
  expect(form).toHaveAttribute("method", "post");
  expect(screen.getByRole("button", { name: "Sign in with Google" })).toHaveAttribute(
    "type",
    "submit",
  );
  expect(
    document.querySelector('input[name="csrfToken"]'),
  ).toHaveValue("csrf-from-auth");
  expect(document.querySelector('input[name="callbackUrl"]')).toHaveValue("/");
  expect(fetch).toHaveBeenCalledWith("/auth/session", {
    credentials: "include",
  });
  expect(fetch).toHaveBeenCalledWith("/auth/csrf", {
    credentials: "include",
  });
});

test("sends a signed-in User to the open-Jobs list", async () => {
  const replace = vi.fn();
  vi.stubGlobal("location", { replace });
  mockAuth({
    session: {
      user: { email: "candidate@example.com" },
      expires: "2099-01-01",
    },
  });

  render(<SignIn />);

  await vi.waitFor(() => {
    expect(replace).toHaveBeenCalledWith("/");
  });
  expect(screen.queryByRole("button", { name: "Sign in with Google" })).not.toBeInTheDocument();
});
