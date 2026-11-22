import cors from "cors";
import express from "express";
import helmet from "helmet";
import { carRouter } from "./cars/car.routes.js";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "100kb" }));

app.use("/api/cars", carRouter);

app.use(notFoundHandler);
app.use(errorHandler);
