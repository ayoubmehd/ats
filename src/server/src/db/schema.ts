import { integer, pgTable, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

const baseCulumns = {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
}

const softDelete = {
  deletedAt: timestamp(),
}

export const usersTable = pgTable("users", {
  ...baseCulumns,
  username: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  role: varchar({
    length: 255,
    enum: ['admin', 'recruiter', 'candidate']
  }).default('candidate').notNull(),
  ...softDelete,
});

export const jobsTable = pgTable("jobs", {
  ...baseCulumns,
  title: varchar({ length: 255 }).notNull(),
  summary: text(), // Gnerate from content
  content: text(),
  status: varchar({
    length: 32,
    enum: ['open', 'closed', 'draft'],
  }).default('draft').notNull(),
  ...softDelete,
  posterId: integer().references(() => usersTable.id),
});


export const applicationsTable = pgTable("applications", {
  ...baseCulumns,
  jobId: integer().references(() => jobsTable.id),
  candidateId: integer().references(() => usersTable.id),
  resume: text(),// url to resume file
  resumeText: text(),// text content of resume
  status: varchar({
    length: 255,
    enum: [
      'applied', // waiting for review
      'screening', // screening in progress
      'interview', // scheduled for interview
      'offer', // offered job
      'hired', // hired by recruiter
      'rejected', // rejected by recruiter
    ],
  }).default('applied').notNull(),
  ...softDelete,
},(t) => [
  unique("application_unique_candidate_job").on(t.jobId, t.candidateId).nullsNotDistinct(),
]);

