import { z } from "zod";
import { CAR_STATUSES } from "./car-status.js";

const MAX_DATABASE_INT = 2_147_483_647;
const OLDEST_CAR_YEAR = 1950;

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function blankToNull(value: unknown): unknown {
  if (value === undefined || (typeof value === "string" && value.trim() === "")) {
    return null;
  }
  return value;
}

function blankToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function latestAllowedCarYear(): number {
  return new Date().getFullYear() + 1;
}

function requiredText(label: string, maxLength: number) {
  return z
    .string({
      error: (issue) =>
        issue.input === undefined || issue.input === null
          ? `${label} is required`
          : `${label} must be text`,
    })
    .transform(collapseWhitespace)
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .max(maxLength, `${label} must be at most ${maxLength} characters`),
    );
}

function optionalText(label: string, maxLength: number) {
  return z.preprocess(
    blankToNull,
    z
      .string({ error: `${label} must be text` })
      .trim()
      .max(maxLength, `${label} must be at most ${maxLength} characters`)
      .nullable(),
  );
}

const yearSchema = z.preprocess(
  blankToNull,
  z
    .number({ error: "Year must be a number" })
    .int("Year must be a whole number")
    .min(OLDEST_CAR_YEAR, `Year must be ${OLDEST_CAR_YEAR} or later`)
    .refine((year) => year <= latestAllowedCarYear(), {
      error: () => `Year must be ${latestAllowedCarYear()} or earlier`,
    })
    .nullable(),
);

const mileageSchema = z.preprocess(
  blankToNull,
  z
    .number({ error: "Mileage must be a number" })
    .int("Mileage must be a whole number")
    .min(0, "Mileage cannot be negative")
    .max(MAX_DATABASE_INT, "Mileage is too large")
    .nullable(),
);

const carStatusSchema = z.enum(CAR_STATUSES, {
  error: (issue) =>
    issue.input === undefined
      ? "Status is required"
      : `Status must be one of ${CAR_STATUSES.join(", ")}`,
});

const carFieldsSchema = z.object({
  licensePlate: requiredText("License plate", 20),
  province: requiredText("Province", 100),
  brand: requiredText("Brand", 50),
  model: requiredText("Model", 50),
  year: yearSchema,
  color: optionalText("Color", 30),
  mileage: mileageSchema,
  note: optionalText("Note", 500),
});

export const createCarSchema = carFieldsSchema.extend({
  status: carStatusSchema.default("AVAILABLE"),
});

export const updateCarSchema = carFieldsSchema.extend({
  status: carStatusSchema,
});

export const carIdParamsSchema = z.object({
  id: z.coerce
    .number({ error: "Car id must be a number" })
    .int("Car id must be a whole number")
    .positive("Car id must be positive")
    .max(MAX_DATABASE_INT, "Car id is too large"),
});

export const listCarsQuerySchema = z.object({
  search: z.preprocess(blankToUndefined, z.string().transform(collapseWhitespace).optional()),
  status: z.preprocess(blankToUndefined, carStatusSchema.optional()),
});

export type CreateCarInput = z.infer<typeof createCarSchema>;
export type UpdateCarInput = z.infer<typeof updateCarSchema>;
export type ListCarsQuery = z.infer<typeof listCarsQuerySchema>;
