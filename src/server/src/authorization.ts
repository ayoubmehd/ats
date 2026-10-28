import { eq } from "drizzle-orm";
import { db } from "./db/connection.js";
import { usersTable } from "./db/schema.js";

export type Role = "admin" | "recruiter" | "candidate";

export type Caller =
  | { kind: "anonymous" }
  | { kind: "user"; id: string; role: Role };

export type JobRecord = {
  status: "open" | "closed" | "draft";
  posterId: string | null;
  deletedAt: Date | null;
};

export type UserRecord = {
  role: Role;
  deletedAt: Date | null;
};

export type ApplicationRecord = {
  deletedAt: Date | null;
};

type NotFoundMessage = "Job not found" | "Candidate not found" | "Application not found";

type Denied =
  | { outcome: "unauthenticated" }
  | { outcome: "forbidden" }
  | { outcome: "not_found"; message: NotFoundMessage };

export type JobListAllow =
  | { outcome: "allow"; scope: "open_only" }
  | { outcome: "allow"; scope: "own_and_open"; posterId: string }
  | { outcome: "allow"; scope: "global" };

export type JobCreateAllow =
  | { outcome: "allow"; posterSource: "caller"; posterId: string }
  | { outcome: "allow"; posterSource: "body" };

export type CandidateListAllow = { outcome: "allow"; scope: "global" };

export type ApplicationListAllow =
  | { outcome: "allow"; scope: "global" }
  | { outcome: "allow"; scope: "own_jobs"; posterId: string }
  | { outcome: "allow"; scope: "own_apps"; candidateId: string };

type Allow = { outcome: "allow" };

type JobListRequest = { resource: "job"; action: "list" };
type JobReadRequest = { resource: "job"; action: "read"; job: JobRecord | null };
type JobCreateRequest = { resource: "job"; action: "create" };
type JobWriteRequest = {
  resource: "job";
  action: "update" | "delete";
  job: JobRecord | null;
};
type CandidateListRequest = { resource: "candidate"; action: "list" };
type CandidateCreateRequest = { resource: "candidate"; action: "create" };
type CandidateReadRequest = {
  resource: "candidate";
  action: "read";
  user: UserRecord | null;
};
type CandidateWriteRequest = {
  resource: "candidate";
  action: "update" | "delete";
  user: UserRecord | null;
};
type ApplicationListRequest = { resource: "application"; action: "list" };
type ApplyRequest = {
  resource: "application";
  action: "apply";
  job: JobRecord | null;
};
type ApplicationActionRequest = {
  resource: "application";
  action: "advance" | "reject";
  application: ApplicationRecord | null;
  job: JobRecord | null;
};

type Request =
  | JobListRequest
  | JobReadRequest
  | JobCreateRequest
  | JobWriteRequest
  | CandidateListRequest
  | CandidateCreateRequest
  | CandidateReadRequest
  | CandidateWriteRequest
  | ApplicationListRequest
  | ApplyRequest
  | ApplicationActionRequest;

const unauthenticated = { outcome: "unauthenticated" } as const;
const forbidden = { outcome: "forbidden" } as const;

function notFound(message: NotFoundMessage) {
  return { outcome: "not_found" as const, message };
}

export async function resolveCaller(
  sessionUserId: string | undefined,
): Promise<Caller> {
  if (!sessionUserId) {
    return { kind: "anonymous" };
  }
  const [user] = await db
    .select({
      id: usersTable.id,
      role: usersTable.role,
      deletedAt: usersTable.deletedAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, sessionUserId));
  if (!user || user.deletedAt) {
    return { kind: "anonymous" };
  }
  return { kind: "user", id: user.id, role: user.role };
}

export function decide(caller: Caller, request: JobListRequest): JobListAllow;
export function decide(
  caller: Caller,
  request: JobCreateRequest,
): JobCreateAllow | Extract<Denied, { outcome: "unauthenticated" | "forbidden" }>;
export function decide(
  caller: Caller,
  request: JobReadRequest,
): Allow | Extract<Denied, { outcome: "forbidden" | "not_found" }>;
export function decide(caller: Caller, request: JobWriteRequest): Allow | Denied;
export function decide(
  caller: Caller,
  request: CandidateListRequest,
): CandidateListAllow | Extract<Denied, { outcome: "unauthenticated" | "forbidden" }>;
export function decide(
  caller: Caller,
  request: CandidateCreateRequest,
): Allow | Extract<Denied, { outcome: "unauthenticated" | "forbidden" }>;
export function decide(
  caller: Caller,
  request: CandidateReadRequest | CandidateWriteRequest,
): Allow | Denied;
export function decide(
  caller: Caller,
  request: ApplicationListRequest,
): ApplicationListAllow | Extract<Denied, { outcome: "unauthenticated" }>;
export function decide(caller: Caller, request: ApplyRequest): Allow | Denied;
export function decide(
  caller: Caller,
  request: ApplicationActionRequest,
): Allow | Denied;
export function decide(caller: Caller, request: Request): JobListAllow | JobCreateAllow | CandidateListAllow | ApplicationListAllow | Allow | Denied {
  if (request.resource === "job") {
    return decideJob(caller, request);
  }
  if (request.resource === "candidate") {
    return decideCandidate(caller, request);
  }
  return decideApplication(caller, request);
}

function decideJob(
  caller: Caller,
  request: JobListRequest | JobReadRequest | JobCreateRequest | JobWriteRequest,
): JobListAllow | JobCreateAllow | Allow | Denied {
  if (request.action === "list") {
    if (caller.kind === "anonymous" || caller.role === "candidate") {
      return { outcome: "allow", scope: "open_only" };
    }
    if (caller.role === "recruiter") {
      return { outcome: "allow", scope: "own_and_open", posterId: caller.id };
    }
    return { outcome: "allow", scope: "global" };
  }

  if (request.action === "read") {
    if (!request.job || request.job.deletedAt) {
      return notFound("Job not found");
    }
    if (caller.kind === "user" && caller.role === "admin") {
      return { outcome: "allow" };
    }
    if (
      caller.kind === "user" &&
      caller.role === "recruiter" &&
      request.job.posterId === caller.id
    ) {
      return { outcome: "allow" };
    }
    if (request.job.status === "open") {
      return { outcome: "allow" };
    }
    return forbidden;
  }

  if (caller.kind === "anonymous") {
    return unauthenticated;
  }
  if (caller.role === "candidate") {
    return forbidden;
  }

  if (request.action === "create") {
    if (caller.role === "recruiter") {
      return { outcome: "allow", posterSource: "caller", posterId: caller.id };
    }
    return { outcome: "allow", posterSource: "body" };
  }

  if (!request.job || request.job.deletedAt) {
    return notFound("Job not found");
  }
  if (caller.role === "admin" || request.job.posterId === caller.id) {
    return { outcome: "allow" };
  }
  return forbidden;
}

function missingCandidate(user: UserRecord | null) {
  if (!user || user.deletedAt || user.role !== "candidate") {
    return notFound("Candidate not found");
  }
  return null;
}

function decideCandidate(
  caller: Caller,
  request:
    | CandidateListRequest
    | CandidateCreateRequest
    | CandidateReadRequest
    | CandidateWriteRequest,
): CandidateListAllow | Allow | Denied {
  if (caller.kind === "anonymous") {
    return unauthenticated;
  }
  if (request.action === "list" || request.action === "read") {
    if (caller.role === "candidate") {
      return forbidden;
    }
    if (request.action === "list") {
      return { outcome: "allow", scope: "global" };
    }
    return missingCandidate(request.user) ?? { outcome: "allow" };
  }
  if (caller.role !== "admin") {
    return forbidden;
  }
  if (request.action === "create") {
    return { outcome: "allow" };
  }
  return missingCandidate(request.user) ?? { outcome: "allow" };
}

function decideApplication(
  caller: Caller,
  request: ApplicationListRequest | ApplyRequest | ApplicationActionRequest,
): ApplicationListAllow | Allow | Denied {
  if (caller.kind === "anonymous") {
    return unauthenticated;
  }
  if (request.action === "list") {
    if (caller.role === "admin") {
      return { outcome: "allow", scope: "global" };
    }
    if (caller.role === "recruiter") {
      return { outcome: "allow", scope: "own_jobs", posterId: caller.id };
    }
    return { outcome: "allow", scope: "own_apps", candidateId: caller.id };
  }
  if (request.action === "apply") {
    if (caller.role !== "candidate") {
      return forbidden;
    }
    if (!request.job || request.job.deletedAt) {
      return notFound("Job not found");
    }
    return { outcome: "allow" };
  }
  if (caller.role === "candidate") {
    return forbidden;
  }
  if (!request.application || request.application.deletedAt) {
    return notFound("Application not found");
  }
  if (caller.role === "admin") {
    return { outcome: "allow" };
  }
  if (!request.job || request.job.deletedAt) {
    return notFound("Application not found");
  }
  if (request.job.posterId !== caller.id) {
    return forbidden;
  }
  return { outcome: "allow" };
}
