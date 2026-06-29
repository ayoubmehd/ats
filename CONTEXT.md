# Applicant Tracking System

Software for recruiters to post jobs, collect applications, and move candidates through a hiring pipeline.

## Language

**User**:
A person in the system with a role: admin, recruiter, or candidate.
_Avoid_: Account, member

**Candidate**:
A User whose role is candidate. Not a separate entity or table.
_Avoid_: Applicant (use Application for the submission itself)

**Job**:
A position posting created by a recruiter or admin.
_Avoid_: Opening, requisition

**Application**:
A Candidate's submission to a Job. At most one per candidate per job.
_Avoid_: Submission, candidacy

**Soft delete**:
A record retained in storage with deletedAt set; excluded from normal reads rather than physically removed.
_Avoid_: Archive, deactivate
