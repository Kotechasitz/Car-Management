import { PrismaLibSql } from "@prisma/adapter-libsql";
import { config } from "./config.js";
import { PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaLibSql({ url: config.databaseUrl });

export const db = new PrismaClient({ adapter });
