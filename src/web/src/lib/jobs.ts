export type JobStatus = "open" | "closed" | "draft";

export type Job = {
  id: number;
  title: string;
  summary: string | null;
  content: string | null;
  status: JobStatus;
  posterId: string | null;
};

const JOB_STATUSES = new Set<JobStatus>(["open", "closed", "draft"]);

export function isJob(value: unknown): value is Job {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const job = value as Record<string, unknown>;
  return (
    typeof job.id === "number" &&
    Number.isFinite(job.id) &&
    typeof job.title === "string" &&
    (job.summary === null || typeof job.summary === "string") &&
    (job.content === null || typeof job.content === "string") &&
    typeof job.status === "string" &&
    JOB_STATUSES.has(job.status as JobStatus)
  );
}

export function isBlank(value: string | null | undefined) {
  return value == null || value.trim() === "";
}

export function openJobsFromPayload(value: unknown): Job[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value.filter(
    (item): item is Job => isJob(item) && item.status === "open",
  );
}
