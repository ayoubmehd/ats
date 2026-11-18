import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { JobList } from "./JobList";
import { deferred, jsonResponse } from "@/tests/fetch";

const openJob = {
  id: 42,
  title: "Software Engineer",
  summary: "A great opportunity",
  content: "Full job description here",
  status: "open",
  posterId: "user_poster",
};

const draftJob = {
  id: 7,
  title: "Secret draft",
  summary: "Internal only",
  content: "Do not show",
  status: "draft",
  posterId: "user_poster",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("shows a skeleton and hidden Loading while GET /jobs is in flight", async () => {
  const pending = deferred<Response>();
  vi.mocked(fetch).mockReturnValue(pending.promise);

  render(<JobList />);

  const loading = screen.getByText("Loading");
  expect(loading).toHaveClass("sr-only");
  expect(loading.closest("[aria-busy='true']")).not.toBeNull();
  expect(document.querySelectorAll("[data-slot='skeleton']")).toHaveLength(6);
  expect(screen.queryByText("Couldn't load jobs")).not.toBeInTheDocument();

  pending.resolve(jsonResponse([]));
  expect(await screen.findByText("No open jobs")).toBeInTheDocument();
});

test("shows No open jobs when the list has zero open Jobs", async () => {
  vi.mocked(fetch).mockResolvedValue(jsonResponse([draftJob]));

  render(<JobList />);

  expect(await screen.findByText("No open jobs")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByText("Secret draft")).not.toBeInTheDocument();
});

test("lists open Jobs by title and summary and links to /:id", async () => {
  vi.mocked(fetch).mockResolvedValue(
    jsonResponse([
      openJob,
      draftJob,
      {
        id: 9,
        title: "Closed role",
        summary: "Filled",
        content: "Gone",
        status: "closed",
        posterId: "user_poster",
      },
    ]),
  );

  render(<JobList />);

  const link = await screen.findByRole("link", { name: /Software Engineer/ });
  expect(link).toHaveAttribute("href", "/42");
  expect(within(link).getByText("A great opportunity")).toBeInTheDocument();
  expect(screen.queryByText("Secret draft")).not.toBeInTheDocument();
  expect(screen.queryByText("Closed role")).not.toBeInTheDocument();
  expect(screen.queryByText("user_poster")).not.toBeInTheDocument();
  expect(screen.queryByText("open")).not.toBeInTheDocument();
  expect(screen.queryByText("42")).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("/jobs");
});

test("shows No summary when summary is missing or whitespace", async () => {
  vi.mocked(fetch).mockResolvedValue(
    jsonResponse([
      { ...openJob, id: 1, title: "Null summary", summary: null },
      { ...openJob, id: 2, title: "Blank summary", summary: "   " },
    ]),
  );

  render(<JobList />);

  expect(await screen.findByRole("link", { name: /Null summary/ })).toBeInTheDocument();
  expect(screen.getAllByText("No summary")).toHaveLength(2);
});

test("shows Couldn't load jobs and Retry when the fetch fails", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    jsonResponse({ message: "nope" }, 500),
  );

  render(<JobList />);

  expect(await screen.findByText("Couldn't load jobs")).toBeInTheDocument();
  expect(screen.queryByText("nope")).not.toBeInTheDocument();
  expect(screen.queryByText("Loading")).not.toBeInTheDocument();

  const retry = screen.getByRole("button", { name: "Retry" });
  const pending = deferred<Response>();
  vi.mocked(fetch).mockReturnValueOnce(pending.promise);

  await userEvent.click(retry);

  expect(screen.getByText("Loading")).toHaveClass("sr-only");
  expect(screen.queryByText("Couldn't load jobs")).not.toBeInTheDocument();

  pending.resolve(jsonResponse([openJob]));
  expect(
    await screen.findByRole("link", { name: /Software Engineer/ }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenNthCalledWith(2, "/jobs");
});

test("Retry after a network error loads open Jobs", async () => {
  vi.mocked(fetch)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(jsonResponse([openJob]));

  render(<JobList />);

  expect(await screen.findByText("Couldn't load jobs")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(
    await screen.findByRole("link", { name: /Software Engineer/ }),
  ).toBeInTheDocument();
});

test("malformed JSON is a fetch failure", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response("not-json", { status: 200 }),
  );

  render(<JobList />);

  expect(await screen.findByText("Couldn't load jobs")).toBeInTheDocument();
});

test("a non-array payload is a fetch failure", async () => {
  vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 1, title: "Nope" }));

  render(<JobList />);

  expect(await screen.findByText("Couldn't load jobs")).toBeInTheDocument();
});
