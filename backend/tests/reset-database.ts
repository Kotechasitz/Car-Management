import { afterAll, beforeEach } from "vitest";
import { db } from "../src/db.js";

beforeEach(async () => {
  await db.car.deleteMany();
});

afterAll(async () => {
  await db.$disconnect();
});
