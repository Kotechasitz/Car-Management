import { Router } from "express";
import {
  carIdParamsSchema,
  createCarSchema,
  listCarsQuerySchema,
  updateCarSchema,
} from "./car.schema.js";
import { createCar, deleteCar, getCar, listCars, updateCar } from "./car.service.js";

export const carRouter = Router();

carRouter.get("/", async (req, res) => {
  const query = listCarsQuerySchema.parse(req.query);
  res.json(await listCars(query));
});

carRouter.get("/:id", async (req, res) => {
  const { id } = carIdParamsSchema.parse(req.params);
  res.json(await getCar(id));
});

carRouter.post("/", async (req, res) => {
  const input = createCarSchema.parse(req.body);
  res.status(201).json(await createCar(input));
});

carRouter.put("/:id", async (req, res) => {
  const { id } = carIdParamsSchema.parse(req.params);
  const input = updateCarSchema.parse(req.body);
  res.json(await updateCar({ id, input }));
});

carRouter.delete("/:id", async (req, res) => {
  const { id } = carIdParamsSchema.parse(req.params);
  await deleteCar(id);
  res.status(204).end();
});
