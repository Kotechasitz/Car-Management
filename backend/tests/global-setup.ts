import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { testEnvironment } from "./test-environment.js";

const backendDirectory = fileURLToPath(new URL("..", import.meta.url));
const testDatabaseFile = fileURLToPath(new URL("../test.db", import.meta.url));

function runPrisma(command: string): void {
  execSync(`npx prisma ${command}`, {
    cwd: backendDirectory,
    env: { ...process.env, ...testEnvironment },
    stdio: "inherit",
  });
}

export function setup(): void {
  rmSync(testDatabaseFile, { force: true });
  runPrisma("generate");
  runPrisma("migrate deploy");
}
