import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "100kb" }));
