# ATS Entity-Relationship Diagram

## Entities

### jobs
| Column     | Type         | Constraints              |
|------------|--------------|--------------------------|
| id         | serial       | PRIMARY KEY              |
| title      | varchar(256) | NOT NULL                 |
| department | varchar(128) | NOT NULL                 |
| description| text         | nullable                 |
| status     | job_status_enum  | NOT NULL, default 'open' |
| createdAt  | timestamp    | NOT NULL, default now()  |

### Users
| Column     | Type         | Constraints             |
|------------|--------------|-------------------------|
| id         | serial       | PRIMARY KEY             |
| name       | varchar(256) | NOT NULL                |
| email      | varchar(256) | NOT NULL, UNIQUE        |
| phone      | varchar(32)  | nullable                |
| role       | varchar(32)  | NOT NULL, default 'candidate' |
| createdAt  | timestamp    | NOT NULL, default now() |

### applications
| Column       | Type            | Constraints                        |
|--------------|-----------------|------------------------------------|
| id           | serial          | PRIMARY KEY                        |
| jobId        | integer         | NOT NULL, FK -> jobs.id            |
| candidateId  | integer         | NOT NULL, FK -> candidates.id      |
| stage        | pipeline_stage  | NOT NULL, default 'applied'        |
| appliedAt    | timestamp       | NOT NULL, default now()            |
| updatedAt    | timestamp       | NOT NULL, default now()            |

UNIQUE constraint on (job_id, candidate_id) - one application per candidate per job.

## pipeline_stage enum
Values: applied, screening, interview, offer, hired, rejected

## job_status_enum
Values: open, closed, draft

## Relationships
- One job has many applications (1:N)
- One candidate has many applications (1:N)
- Each application belongs to exactly one job and one candidate