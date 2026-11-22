import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.js";

describe("unexpected errors", () => {
  let app: Express;
  let brokenDb: PrismaClient;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", ":memory:");
    vi.resetModules();
    ({ app } = await import("../src/app.js"));
    ({ db: brokenDb } = await import("../src/db.js"));
  });

  afterAll(async () => {
    await brokenDb.$disconnect();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 500 with a generic message and logs the cause when the database fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await request(app).get("/api/cars");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error" });
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
