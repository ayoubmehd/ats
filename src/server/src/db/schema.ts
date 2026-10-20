import {
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

const timestampColumns = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
};

const baseCulumns = {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ...timestampColumns,
};

const softDelete = {
  deletedAt: timestamp(),
};

export const usersTable = pgTable("users", {
  id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  role: varchar({
    length: 255,
    enum: ["admin", "recruiter", "candidate"],
  })
    .default("candidate")
    .notNull(),
  emailVerified: timestamp(),
  image: text(),
  ...timestampColumns,
  ...softDelete,
});

export const accountsTable = pgTable("accounts", {
  userId: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.id),
  type: varchar({ length: 255 }).notNull(),
  provider: varchar({ length: 255 }).notNull(),
  providerAccountId: varchar({ length: 255 }).notNull(),
  refresh_token: text(),
  access_token: text(),
  expires_at: integer(),
  token_type: varchar({ length: 255 }),
  scope: varchar({ length: 255 }),
  id_token: text(),
  session_state: varchar({ length: 255 }),
});

export const sessionsTable = pgTable("sessions", {
  sessionToken: varchar({ length: 255 }).primaryKey(),
  userId: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.id),
  expires: timestamp().notNull(),
});

export const verificationTokensTable = pgTable(
  "verification_tokens",
  {
    identifier: varchar({ length: 255 }).notNull(),
    token: varchar({ length: 255 }).notNull(),
    expires: timestamp().notNull(),
  },
  (t) => [unique("verification_token_unique").on(t.identifier, t.token)],
);

export const jobsTable = pgTable("jobs", {
  ...baseCulumns,
  title: varchar({ length: 255 }).notNull(),
  summary: text(), // Gnerate from content
  content: text(),
  status: varchar({
    length: 32,
    enum: ["open", "closed", "draft"],
  })
    .default("draft")
    .notNull(),
  ...softDelete,
  posterId: varchar({ length: 255 }).references(() => usersTable.id),
});

export const applicationsTable = pgTable(
  "applications",
  {
    ...baseCulumns,
    jobId: integer().references(() => jobsTable.id),
    candidateId: varchar({ length: 255 }).references(() => usersTable.id),
    resume: text(), // url to resume file
    resumeText: text(), // text content of resume
    status: varchar({
      length: 255,
      enum: [
        "applied", // waiting for review
        "screening", // screening in progress
        "interview", // scheduled for interview
        "offer", // offered job
        "hired", // hired by recruiter
        "rejected", // rejected by recruiter
      ],
    })
      .default("applied")
      .notNull(),
    ...softDelete,
  },
  (t) => [
    unique("application_unique_candidate_job")
      .on(t.jobId, t.candidateId)
      .nullsNotDistinct(),
  ],
);
