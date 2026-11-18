# Public job APIs that could seed Jobs

Researched 2026-11-18 against first-party docs, terms pages, and live HTTP GETs from this machine. These rows would be **Jobs** with `posterId` null and status open. This note does not pick an API and does not invent a seeded-Job entity.

Live checks used `curl` with `User-Agent: Mozilla/5.0 (compatible; ATS-research/1.0; +https://example.local)` unless noted. Remote OK was also called with curl’s default User-Agent.

## Viable for this seed vs disqualified

**Viable (no paid key, live JSON, terms allow fetch + a committed fixture + insert into a private local database), with attribution that later mapping can fold into `content`:**

| API | Auth | Why it survives |
| --- | --- | --- |
| [Jobicy](https://jobicy.com/jobs-rss-feed) | none | Live `GET /api/jobs`. Docs allow job boards, storing/caching/redistributing, and a fixture-like retain, if listings stay credited and apply links stay on Jobicy. |
| [Himalayas](https://himalayas.app/docs/remote-jobs-api) | none (optional free Bearer key) | Live `GET /jobs/api`. API terms allow showing jobs on a site we operate and caching; apply must use `applicationLink`. |
| [Remotive](https://github.com/remotive-com/remote-jobs-api) | none | Live `GET /api/remote-jobs`. Access is granted so developers can share listings further, with a Remotive URL and source credit. |
| [Remote OK](https://remoteok.com/faq) | none | Live `GET /api`. Feed is free; must mention Remote OK and follow-link each listing URL. |

Recommend these three no-paid-key options to [Which job API the seed uses](../issues/02-which-job-api-the-seed-uses.md), without choosing one here: **Jobicy**, **Himalayas**, **Remotive**. Remote OK is a fourth live no-key option if the public board can carry a follow link in `content`.

**Disqualified**

| API | Why |
| --- | --- |
| 4dayweek.io | Live and no-key, but the API licence forbids populating a competing job board or a similar listings database, and revocation requires deleting stored copies. |
| Arbeitnow | Live and no-key, but API `meta.terms` bind callers to the website ToS, whose use licence forbids copying, public display, and mirroring on another server. |
| Greenhouse / Lever / Ashby public boards | Live and no-key, but each call is one employer’s careers board, not a mixed listing catalog. Official docs are for that employer’s job site. |
| USAJOBS Search | Free key (not a paid plan) is required; unauthenticated GET is `401`. Keep as a fallback if ticket 02 accepts a free key. |
| Adzuna | Key required. Org/commercial use is a 14-day evaluation then a licence; termination requires removing all Adzuna data. |
| The Muse | Documented public Jobs URL returns Cloudflare `403` HTML; developer docs URL now serves marketing HTML. |
| Reed Jobseeker | `GET /api/1.0/search` returns `401` + `WWW-Authenticate: Basic`. Current `/developers` page documents recruiter posting, not a listing API. |
| GitHub Jobs | `jobs.github.com` connection failed (host dead). |
| Indeed | `api.indeed.com` does not resolve; Arbeitnow’s first-party blog says the Indeed API is no longer maintained. |
| We Work Remotely | Live RSS only, not JSON. |

---

## Jobicy (recommended option)

Sources: [Remote Jobs API/RSS Feed](https://jobicy.com/jobs-rss-feed), [Terms of Service](https://jobicy.com/terms-and-conditions).

- **Auth:** none for the public Jobs API. A paid Commercial Bearer key is optional and only swaps `url` to a direct ATS apply link at $0.01 per new job. This seed does not need it.
- **Request:** `GET https://jobicy.com/api/jobs?count=20`. No required header. CORS `access-control-allow-origin: *`. `/api/v2/remote-jobs` still returns the same JSON (live alias).
- **Live:** HTTP 200, `application/json`, 2026-11-18. `count=5` returned 5 jobs, `hasMore: true`.
- **One listing (live keys):** `id` (163096), `url` (Jobicy listing), `jobSlug`, `jobTitle`, `companyName`, `companyLogo`, `jobIndustry[]`, `jobType[]`, `jobGeo`, `jobLevel`, `jobExcerpt`, `jobDescription` (HTML), `pubDate`. Salary fields `salaryMin` / `salaryMax` / `salaryCurrency` / `salaryPeriod` exist in the schema; the sampled listing had them null.
- **Pagination:** `count` 1–100, default 100. Cursor via `nextCursor` → `cursor`. Window is listings published in the last 7 days, delayed 3 hours.
- **Rate limits:** HTTP `429` is documented. Automated pass “no more than once per hour”; RSS “must not exceed once per hour”. No numeric per-minute quota on the docs page. Live response had no `X-RateLimit-*` headers.
- **Terms vs this seed:** Fetch is the documented public GET. “You may store, cache, process, and retain Jobicy API data without a fixed retention period.” FAQ: store, cache, process, and redistribute with credit. “Most integrations, including job boards… can use the public API without a separate agreement.” Do not present listings as our own original Job postings; credit Jobicy and keep apply links on the Jobicy `url`. Folding `url` plus “Jobicy” into `content` matches that. Website ToS also forbids scraping *other than via the official API*.

---

## Himalayas (recommended option)

Sources: [Remote Jobs API Reference](https://himalayas.app/docs/remote-jobs-api), [API page](https://himalayas.app/api), [Terms](https://himalayas.app/terms) clause 113.

- **Auth:** none. Optional free `Authorization: Bearer` key for 60 req/min and 10,000/UTC day. Unkeyed callers share one public allowance; cached responses do not count.
- **Request:** `GET https://himalayas.app/jobs/api?limit=20`. No required header. Docs show curl without a key.
- **Live:** HTTP 200, `application/json`, 2026-11-18. `limit=5` returned 5 jobs, `totalCount` 117876, `nextCursor` present. `Cache-Control: public, … s-maxage=7200`.
- **One listing (live keys):** `title`, `excerpt` (plain), `companyName`, `companySlug`, `companyLogo`, `employmentType`, `minSalary` / `maxSalary` / `salaryPeriod` / `currency`, `seniority[]`, `locationRestrictions[]`, `timezoneRestrictions[]`, `categories[]`, `parentCategories[]`, `description` (sanitized HTML), `pubDate` / `expiryDate` (unix seconds), `applicationLink`, `guid`.
- **Pagination:** `limit` default 20, max 20. Cursor via `nextCursor`. `offset` is deprecated. Search is a separate `/jobs/api/search`.
- **Rate limits:** keyed 60/min and 10k/day. Unkeyed shared, unpublished number except the single-job endpoint “allows 60 requests a minute” without a key. Data refreshes every 24 hours; poll at most daily. `429` + `Retry-After` when keyed.
- **Terms vs this seed:** Clause 113 allows personal and commercial use, including “showing Himalayas jobs on your own job board, website or app.” (a) apply via `applicationLink`; (b) visible Himalayas credit/link; (c) only on sites we operate — do not pass to other boards/aggregators/Google Jobs/LinkedIn, including feeds or JobPosting structured data; (d) “Cache job data where you can” and drop expired jobs. A private local database and a board we operate match (c)+(d). A committed git fixture is a cache; if this repo is public, treat that as possible redistribution under (c) and keep the fixture internal or strip apply-side structured data.

---

## Remotive (recommended option)

Sources: [GitHub README (canonical API docs)](https://github.com/remotive-com/remote-jobs-api/blob/master/README.md) (raw: [README.md](https://raw.githubusercontent.com/remotive-com/remote-jobs-api/master/README.md)), [API landing](https://remotive.com/remote-jobs/api), live `0-legal-notice`, [Terms of Use](https://remotive.com/terms-of-use).

- **Auth:** none.
- **Request:** `GET https://remotive.com/api/remote-jobs?limit=20`. No required header. CORS `access-control-allow-origin: *`.
- **Live:** HTTP 200, `application/json; charset=utf-8`, 2026-11-18. Docs example is `limit=1`. Live `?limit=5` returned `job-count`/`total-job-count` **16**, not 5 — do not assume `limit` is strictly honoured.
- **One listing (live keys):** `id`, `url` (Remotive page), `title`, `company_name`, `company_logo` / `company_logo_url`, `category`, `job_type`, `publication_date`, `candidate_required_location`, `salary` (free text, e.g. `$170k - $200k`), `tags[]`, `description` (HTML).
- **Pagination:** no page token. `limit` “default: all”. Categories at `/api/remote-jobs/categories`.
- **Rate limits:** “max. 4 times a day”; “more than 2x per minute will be blocked.” Live body repeats that. No `X-RateLimit-*` on the 200.
- **Terms vs this seed:** “API documentation and access is granted so that developers can share our jobs further.” Must link the Remotive `url` and mention Remotive. Do not submit listings to third-party job sites (Jooble, Neuvoo, Google Jobs, LinkedIn Jobs). Do not gate listings behind email signup. Paid private API starts at $5k/mo in the live notice — not required. Inserting into a private local database and showing Jobs on this ATS with Remotive credited in `content` is the stated “share further” use. Committing a fixture is a local cache of that share, not submitting to another job board.

---

## Remote OK (also viable)

Sources: [FAQ — Feeds & sponsorship](https://remoteok.com/faq), [Terms](https://remoteok.com/legal), live element `[0].legal`.

- **Auth:** none. FAQ: “The feeds are free and require no authentication.”
- **Request:** `GET https://remoteok.com/api`. Optional `?tag=dev` / `?tags=dev,python`. No required header. Live 200 with **curl’s default User-Agent** and with the research User-Agent. CORS `access-control-allow-origin: *`.
- **Live:** HTTP 200, `application/json`, 642331 bytes, 2026-11-18. Array length 98: index 0 is legal/metadata, **97 jobs**.
- **One listing (live keys from index 1):** `id`, `slug`, `epoch`, `date`, `company`, `company_logo`, `position` (title), `tags[]`, `description` (HTML), `location` (empty on the sample), `salary_min` / `salary_max` (0 on the sample), `url`, `apply_url`, `logo`.
- **Pagination:** none. Whole recent window in one array. FAQ does not state a page size; live window was 97 jobs after the legal object.
- **Rate limits:** not published on FAQ or `/legal`. No `X-RateLimit-*` on the 200.
- **Terms vs this seed:** Live `legal` and `/legal`: “link back (with follow, and without nofollow!) to the URL on Remote OK and mention Remote OK as a source.” `/legal`: “You agree to link back with a web hyperlink or in-app hyperlink to our site on the page or app screen where you use the data from our APIs or site.” Do not use the Remote OK logo. Fetch and a git fixture are not a display surface. Jobs on the public board must carry a follow link to each Remote OK `url` (plain `content` can hold that URL). FAQ explicitly invites aggregators who credit and link.

---

## 4dayweek.io (disqualified)

Sources: [Developer API](https://4dayweek.io/developers), [Terms](https://4dayweek.io/terms) “Licence to Use API and MCP Results”.

- **Auth:** none. Live `GET https://4dayweek.io/api/v2/jobs?limit=5` → 200 JSON, `x-ratelimit-limit: 60`, `x-ratelimit-remaining: 60`. Default page size 25, max 100. Fields include `title`, `description` (plain, no HTML), `company.name`, `locations[]`, `salary_min`/`salary_max` (cents), `url`, `id`.
- **Disqualifier:** licence (d) “do not use the Results to build, train or populate a competing job board or a substantially similar database of employers or listings.” This seed inserts open Jobs that appear on the public board and keeps a committed fixture. On revocation, stored copies must be deleted within 30 days, which fights a git fixture.

---

## Arbeitnow (disqualified)

Sources: [Job Board API blog](https://www.arbeitnow.com/blog/job-board-api), [Terms](https://www.arbeitnow.com/terms) §§2 and 11, [Postman](https://documenter.getpostman.com/view/18545278/UVJbJdKh), live `meta`.

- **Auth:** none. Blog: “requires no API key.”
- **Request:** `GET https://www.arbeitnow.com/api/job-board-api`. UK twin: `https://www.arbeitnow.co.uk/api/job-board-api`. `?page=` and `?visa_sponsorship=true`.
- **Live:** HTTP 200, ~2.1 MB JSON, 2026-11-18. `meta.per_page` **300**, `data` length 300, `links.next` page 2. Headers `x-ratelimit-limit: 50`, `x-ratelimit-remaining: 49` (window not named). Listing keys: `slug`, `company_name`, `title`, `description` (HTML), `remote`, `url`, `tags[]`, `job_types[]`, `location`, `created_at`. No salary field.
- **Disqualifier:** live `meta.terms`: “By using the API, you agree to the terms of service present on Arbeitnow.com.” §2.1 grants only “temporarily download one copy … for personal, non-commercial transitory viewing” and forbids modifying or copying, “any commercial purpose, or … any public display (commercial or non-commercial),” and “mirror the materials on any other server.” This seed copies into git, stores in Postgres, and displays Jobs on the public board. §11 only adds as-is warranty, a link-back, and revocability; it does not grant a copy/display licence. The blog still *describes* an aggregator use — ticket 02 could ask Arbeitnow, but the binding ToS text does not allow this seed as written.

---

## Per-employer ATS boards (disqualified as mixed listing APIs)

These are live, no-key JSON feeds for **one company’s** published Jobs. Official purpose is that company’s careers page, not a catalog this ATS can own as `posterId` null Jobs.

### Greenhouse Job Board API

[Job Board API](https://docs.greenhouse.io/job-board): “Job Board data is publicly available, so authentication is not required for any GET endpoints.”

- **Request:** `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`. No required header.
- **Live:** `board_token=greenhouse` → 200, `meta.total` 26. Listing keys include `id`, `title`, `company_name`, `location.name`, `absolute_url`, `content` (HTML entities), `departments`, `offices`, `internal_job_id`.
- **Pagination:** list returns the whole board (`meta.total`). Harvest-style `page` on other resources is 100 per page; the jobs list for this board was complete in one call.
- **Rate limits:** not stated on the Job Board doc.

### Lever Postings API

[lever/postings-api README](https://github.com/lever/postings-api/blob/master/README.md): “designed to help you create a job site” for **your** company.

- **Request:** `GET https://api.lever.co/v0/postings/{site}?mode=json&limit=5`. No key for GET. EU host `api.eu.lever.co`.
- **Live:** `site=leverdemo` → 200, 5 objects. Keys: `id`, `text` (title), `categories` (location/team/department/commitment), `description` / `descriptionPlain` (HTML/plain), `salaryRange`, `hostedUrl`, `applyUrl`, `workplaceType`, `country`.
- **Pagination:** `skip` + `limit`. Limit default is not named as a number in the README table; live `limit=5` returned 5.
- GET rate limits are not documented (POST apply is `429`-limited).

### Ashby Job Postings API

[Public Job Posting API](https://developers.ashbyhq.com/docs/public-job-posting-api): “all currently published Job Postings for **your organization**” to populate **your** careers page.

- **Request:** `GET https://api.ashbyhq.com/posting-api/job-board/{JOB_BOARD_NAME}?includeCompensation=true`. No key.
- **Live:** `JOB_BOARD_NAME=Ashby` → 200, 77 jobs, ~4.6 MB. Keys: `id`, `title`, `department`, `team`, `employmentType`, `location`, `descriptionHtml`, `descriptionPlain`, `jobUrl`, `applyUrl`, `compensation`, `workplaceType`, `isRemote`, `publishedAt`.

---

## USAJOBS Search (free key, not no-key)

Sources: [Authentication](https://developer.usajobs.gov/guides/authentication), [Rate limiting](https://developer.usajobs.gov/guides/rate-limiting), [API Access Request / Terms](https://developer.usajobs.gov/apirequest/), [GET Search](https://developer.usajobs.gov/api-reference/get-api-search).

- **Auth:** free API key from the request form. Headers: `Host: data.usajobs.gov`, `User-Agent: <email used to request the key>`, `Authorization-Key: <key>`. Codelist endpoints need no key.
- **Request:** `GET https://data.usajobs.gov/api/search?...`
- **Live without key:** `GET …/api/search?Keyword=software` → **401** `application/problem+json` `{"title":"Unauthorized","status":401}`. Codelist GET without key → 200 (confirms the host is up).
- **Shape (docs sample):** `SearchResult.SearchResultItems[].MatchedObjectDescriptor` with `PositionTitle`, `PositionURI`, `OrganizationName`, `PositionLocationDisplay`, `PositionRemuneration`, `JobCategory`, `QualificationSummary`, `UserArea.Details` (`JobSummary`, `MajorDuties`, …).
- **Pagination:** `ResultsPerPage` up to 500; max 10,000 rows per query.
- **Terms:** Public Data “may be copied, stored, reformatted, adapted, analyzed, published, redistributed, and used for lawful commercial or noncommercial purposes.” Fixture + local DB are explicitly allowed. Identify USAJOBS as source and link the official announcement. This is a good ToS fit **if** ticket 02 accepts a free key.

---

## Adzuna (disqualified)

Sources: [Overview](https://developer.adzuna.com/overview), [Search](https://developer.adzuna.com/docs/search), [API Terms](https://developer.adzuna.com/docs/terms_of_service).

- **Auth:** `app_id` + `app_key` query params. “Every registered API user receives a free API key immediately, with no payment details required. The free tier is intended for evaluating the API.”
- **Request:** `GET https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=…&app_key=…`
- **Live without key:** HTTP **400** HTML “Uh oh, something isn't right.”
- **Disqualifier:** commercial/government/academic use is a 14-day trial then a licence. “Upon termination … an API user shall immediately remove all insertion codes and data acquired from Adzuna.” A committed fixture cannot be deleted on key expiry. Publishing listings also requires a 116×23 “Adzuna” hyperlink.

---

## The Muse (disqualified — not live)

- Documented URL `https://www.themuse.com/developers/api/v2` currently renders The Muse marketing homepage, not API docs (fetched 2026-11-18).
- Live `GET https://www.themuse.com/api/public/jobs?page=1` → **403** `text/html`, `cf-mitigated: challenge`, title “Just a moment…”.
- `GET https://api-v2.themuse.com/jobs?page=1` → **404** HTML.

---

## Reed, GitHub Jobs, Indeed, We Work Remotely (disqualified)

- **Reed:** `GET https://www.reed.co.uk/api/1.0/search?keywords=developer` → **401**, `www-authenticate: Basic`, empty body. [reed.co.uk/developers](https://www.reed.co.uk/developers) now describes posting jobs to Reed, not a public listing search. No listing ToS to cite from that page.
- **GitHub Jobs:** `GET https://jobs.github.com/positions.json` → curl exit 7, could not connect (host gone).
- **Indeed:** `api.indeed.com` DNS failure. Arbeitnow’s own [Job Board API](https://www.arbeitnow.com/blog/job-board-api) post: “the Indeed API is no longer maintained and it requires a published account which we cannot obtain anymore.”
- **We Work Remotely:** `GET https://weworkremotely.com/categories/remote-programming-jobs.rss` → 200 `application/rss+xml`. Ticket asked for JSON shape of one listing; this is RSS, so it is out.

---

## Field coverage vs this ATS Job

ATS Job columns in use: `title`, `summary`, `content`, `status` (open), `posterId` (null), `deletedAt` (null). Map extras into `content` as plain text.

| API | title | HTML/text body | company | location | salary | tags | stable id |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Jobicy | `jobTitle` | `jobDescription` HTML + `jobExcerpt` | `companyName` | `jobGeo` | min/max/currency/period (often null) | `jobIndustry`, `jobType` | `id` |
| Himalayas | `title` | `description` HTML + `excerpt` | `companyName` | `locationRestrictions` | min/max/currency/period | `categories` | `guid` |
| Remotive | `title` | `description` HTML | `company_name` | `candidate_required_location` | free-text `salary` | `tags` | `id` |
| Remote OK | `position` | `description` HTML | `company` | `location` (often empty) | `salary_min`/`salary_max` | `tags` | `id` |

All four can supply more than 10–20 Jobs in one or two GETs. Himalayas max page is 20, which matches the seed count exactly.

---

## Method notes

- Primary sources only for claims above. Secondary roundups were used only as pointers to official URLs, then discarded.
- Live bodies were not committed; this file quotes field names and short samples.
- “Store in git as a fixture” and “insert into a private local database” were scored against each provider’s own API/ToS language, not against a general scraping theory.
