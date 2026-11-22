import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";

const server = app.listen(config.port, (error) => {
  if (error) {
    throw error;
  }
  console.info(`Server listening on http://localhost:${config.port}`);
});

function closeServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function shutDown(signal: NodeJS.Signals): Promise<void> {
  console.info(`${signal} received, shutting down`);
  await closeServer();
  await db.$disconnect();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    shutDown(signal).catch((error: unknown) => {
      console.error("Shutdown failed", error);
      process.exitCode = 1;
    });
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception", error);
  process.exit(1);
});
