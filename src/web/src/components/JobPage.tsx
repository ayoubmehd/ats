import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isBlank, isJob, type Job } from "@/lib/jobs";

type View =
  | { status: "loading" }
  | { status: "error" }
  | { status: "unavailable" }
  | { status: "ready"; job: Job };

function JobSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function JobPage({ jobId }: { jobId: string }) {
  const [view, setView] = useState<View>({ status: "loading" });

  const load = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await fetch(`/jobs/${jobId}`);
      if (response.status === 403 || response.status === 404) {
        setView({ status: "unavailable" });
        return;
      }
      if (!response.ok) {
        setView({ status: "error" });
        return;
      }
      const payload: unknown = await response.json();
      if (!isJob(payload)) {
        setView({ status: "error" });
        return;
      }
      if (payload.status !== "open") {
        setView({ status: "unavailable" });
        return;
      }
      setView({ status: "ready", job: payload });
    } catch {
      setView({ status: "error" });
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (view.status === "loading") {
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading</span>
        <JobSkeleton />
      </div>
    );
  }

  if (view.status === "unavailable") {
    return <p>Job not available</p>;
  }

  if (view.status === "error") {
    return (
      <div>
        <p>Couldn't load this job</p>
        <Button type="button" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-semibold">{view.job.title}</h1>
      <p className="text-muted-foreground">
        {isBlank(view.job.summary) ? "No summary" : view.job.summary}
      </p>
      <p className="whitespace-pre-wrap">
        {isBlank(view.job.content) ? "No description" : view.job.content}
      </p>
    </article>
  );
}
