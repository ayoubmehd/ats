import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isBlank, openJobsFromPayload, type Job } from "@/lib/jobs";

type View = { status: "loading" } | { status: "error" } | { status: "ready"; jobs: Job[] };

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function JobList() {
  const [view, setView] = useState<View>({ status: "loading" });

  const load = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await fetch("/jobs");
      if (!response.ok) {
        setView({ status: "error" });
        return;
      }
      const payload: unknown = await response.json();
      const jobs = openJobsFromPayload(payload);
      if (jobs == null) {
        setView({ status: "error" });
        return;
      }
      setView({ status: "ready", jobs });
    } catch {
      setView({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (view.status === "loading") {
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading</span>
        <ListSkeleton />
      </div>
    );
  }

  if (view.status === "error") {
    return (
      <div>
        <p>Couldn't load jobs</p>
        <Button type="button" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  if (view.jobs.length === 0) {
    return <p>No open jobs</p>;
  }

  return (
    <ul className="space-y-4">
      {view.jobs.map((job) => (
        <li key={job.id}>
          <a href={`/${job.id}`} className="block space-y-1">
            <h2 className="text-lg font-medium">{job.title}</h2>
            <p className="text-muted-foreground">
              {isBlank(job.summary) ? "No summary" : job.summary}
            </p>
          </a>
        </li>
      ))}
    </ul>
  );
}
