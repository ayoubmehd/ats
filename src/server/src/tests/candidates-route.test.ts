import { candidatesRouter } from "../routes/candidates.js";
import { test, expect } from "vitest";

test("get candidates", async () => {
  const response = await candidatesRouter.request("/candidates");
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.length).toBeGreaterThan(0);
  expect(body[0].id).toBeDefined();
});

let lastCandidateId: number;

test("create candidate", async () => {
  const response = await candidatesRouter.request("/candidates", {
    method: "POST",
    body: JSON.stringify({
      username: "John Doe",
      email: "john.doe.1@example.com",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBeDefined();
  lastCandidateId = body.id;
  expect(body.username).toBe("John Doe");
  expect(body.email).toBe("john.doe.1@example.com");
});

test("get candidate", async () => {
  const response = await candidatesRouter.request(
    `/candidates/${lastCandidateId}`,
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(lastCandidateId);
  expect(body.username).toBe("John Doe");
  expect(body.email).toBe("john.doe.1@example.com");
});

test("update candidate", async () => {
  const response = await candidatesRouter.request(
    `/candidates/${lastCandidateId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        username: "John Doe 2",
        email: "john.doe.2@example.com",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(lastCandidateId);
  expect(body.username).toBe("John Doe 2");
  expect(body.email).toBe("john.doe.2@example.com");
});

test("delete candidate", async () => {
  const response = await candidatesRouter.request(
    `/candidates/${lastCandidateId}`,
    {
      method: "DELETE",
    },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Candidate deleted successfully");
});

test("get deleted candidate", async () => {
  const response = await candidatesRouter.request(
    `/candidates/${lastCandidateId}`,
  );
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Candidate not found");
});
