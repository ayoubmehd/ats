import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { JobPage } from "./JobPage";
import { deferred, jsonResponse } from "@/tests/fetch";

const openJob = {
  id: 42,
  title: "Software Engineer",
  summary: "A great opportunity",
  content: "Line one\nLine two",
  status: "open",
  posterId: "user_poster",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("shows a skeleton and hidden Loading while GET /jobs/:id is in flight", async () => {
  const pending = deferred<Response>();
  vi.mocked(fetch).mockReturnValue(pending.promise);

  render(<JobPage jobId="42" />);

  const loading = screen.getByText("Loading");
  expect(loading).toHaveClass("sr-only");
  expect(loading.closest("[aria-busy='true']")).not.toBeNull();
  expect(document.querySelectorAll("[data-slot='skeleton']")).toHaveLength(3);

  pending.resolve(jsonResponse(openJob));
  expect(await screen.findByRole("heading", { name: "Software Engineer" })).toBeInTheDocument();
});

test("shows title, summary, and plain-text content for an open Job", async () => {
  vi.mocked(fetch).mockResolvedValue(jsonResponse(openJob));

  render(<JobPage jobId="42" />);

  expect(
    await screen.findByRole("heading", { name: "Software Engineer" }),
  ).toBeInTheDocument();
  expect(screen.getByText("A great opportunity")).toBeInTheDocument();
  const content = screen.getByText(/Line one/);
  expect(content.textContent).toContain("Line one");
  expect(content.textContent).toContain("Line two");
  expect(content).toHaveClass("whitespace-pre-wrap");
  expect(screen.queryByText("user_poster")).not.toBeInTheDocument();
  expect(screen.queryByText("open")).not.toBeInTheDocument();
  expect(screen.queryByText("42")).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("/jobs/42");
});

test("does not render HTML in content", async () => {
  vi.mocked(fetch).mockResolvedValue(
    jsonResponse({ ...openJob, content: "<b>Bold</b>" }),
  );

  const { container } = render(<JobPage jobId="42" />);

  expect(await screen.findByText("<b>Bold</b>")).toBeInTheDocument();
  expect(container.querySelector("b")).toBeNull();
});

test("uses placeholders for missing summary and content", async () => {
  vi.mocked(fetch).mockResolvedValue(
    jsonResponse({ ...openJob, summary: "  ", content: null }),
  );

  render(<JobPage jobId="42" />);

  expect(await screen.findByText("No summary")).toBeInTheDocument();
  expect(screen.getByText("No description")).toBeInTheDocument();
});

test.each([404, 403])(
  "stays on the Job page with Job not available for %s",
  async (status) => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ message: status === 404 ? "Job not found" : "Forbidden" }, status),
    );

    render(<JobPage jobId="42" />);

    expect(await screen.findByText("Job not available")).toBeInTheDocument();
    expect(screen.queryByText("Job not found")).not.toBeInTheDocument();
    expect(screen.queryByText("Forbidden")).not.toBeInTheDocument();
    expect(screen.queryByText("Couldn't load this job")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  },
);

test("hides a 200 Job whose status is not open", async () => {
  vi.mocked(fetch).mockResolvedValue(
    jsonResponse({ ...openJob, status: "draft", title: "Hidden draft" }),
  );

  render(<JobPage jobId="42" />);

  expect(await screen.findByText("Job not available")).toBeInTheDocument();
  expect(screen.queryByText("Hidden draft")).not.toBeInTheDocument();
});

test("shows Couldn't load this job and Retry on other failures", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    jsonResponse({ message: "boom" }, 500),
  );

  render(<JobPage jobId="42" />);

  expect(await screen.findByText("Couldn't load this job")).toBeInTheDocument();
  expect(screen.queryByText("boom")).not.toBeInTheDocument();

  const pending = deferred<Response>();
  vi.mocked(fetch).mockReturnValueOnce(pending.promise);
  await userEvent.click(screen.getByRole("button", { name: "Retry" }));

  expect(screen.getByText("Loading")).toHaveClass("sr-only");
  pending.resolve(jsonResponse(openJob));
  expect(
    await screen.findByRole("heading", { name: "Software Engineer" }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenNthCalledWith(2, "/jobs/42");
});

test("malformed Job JSON is a fetch failure", async () => {
  vi.mocked(fetch).mockResolvedValue(jsonResponse({ title: "Almost" }));

  render(<JobPage jobId="42" />);

  expect(await screen.findByText("Couldn't load this job")).toBeInTheDocument();
});
