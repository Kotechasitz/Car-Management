import { z } from "zod";
import { db } from "../db.js";
import { ConflictError, NotFoundError } from "../errors/http-errors.js";
import { Prisma, type Car } from "../generated/prisma/client.js";
import type { CreateCarInput, ListCarsQuery, UpdateCarInput } from "./car.schema.js";

const LIKE_ESCAPE_CHARACTER = "!";
const DUPLICATE_PLATE_MESSAGE = "A car with this license plate already exists in this province";

const carIdRowsSchema = z.array(z.object({ id: z.number().int() }));

const newestCreatedFirst = [
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.CarOrderByWithRelationInput[];

type PrismaErrorCode = "P2002" | "P2025";

function escapeLikePattern(value: string): string {
  return value.replace(/[!%_]/g, (character) => `${LIKE_ESCAPE_CHARACTER}${character}`);
}

function hasPrismaErrorCode(error: unknown, code: PrismaErrorCode): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function carNotFound(id: number): NotFoundError {
  return new NotFoundError(`Car ${id} not found`);
}

function duplicatePlate(): ConflictError {
  return new ConflictError(DUPLICATE_PLATE_MESSAGE, [
    { path: "licensePlate", message: DUPLICATE_PLATE_MESSAGE },
  ]);
}

async function findCarIdsMatching(search: string): Promise<number[]> {
  const pattern = `%${escapeLikePattern(search)}%`;
  const rows = await db.$queryRaw`
    SELECT "id" FROM "Car"
    WHERE "licensePlate" LIKE ${pattern} ESCAPE ${LIKE_ESCAPE_CHARACTER}
       OR "province" LIKE ${pattern} ESCAPE ${LIKE_ESCAPE_CHARACTER}
       OR "brand" LIKE ${pattern} ESCAPE ${LIKE_ESCAPE_CHARACTER}
       OR "model" LIKE ${pattern} ESCAPE ${LIKE_ESCAPE_CHARACTER}
  `;
  const parsedRows = carIdRowsSchema.safeParse(rows);
  if (!parsedRows.success) {
    throw new Error("Car search query returned rows in an unexpected shape", {
      cause: parsedRows.error,
    });
  }
  return parsedRows.data.map((row) => row.id);
}

export async function listCars({ search, status }: ListCarsQuery): Promise<Car[]> {
  const matchingIds = search === undefined ? undefined : await findCarIdsMatching(search);
  return db.car.findMany({
    where: {
      status,
      id: matchingIds === undefined ? undefined : { in: matchingIds },
    },
    orderBy: newestCreatedFirst,
  });
}

export async function getCar(id: number): Promise<Car> {
  const car = await db.car.findUnique({ where: { id } });
  if (car === null) {
    throw carNotFound(id);
  }
  return car;
}

export async function createCar(input: CreateCarInput): Promise<Car> {
  try {
    return await db.car.create({ data: input });
  } catch (error) {
    throw hasPrismaErrorCode(error, "P2002") ? duplicatePlate() : error;
  }
}

export async function updateCar({
  id,
  input,
}: {
  id: number;
  input: UpdateCarInput;
}): Promise<Car> {
  try {
    return await db.car.update({ where: { id }, data: input });
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2025")) {
      throw carNotFound(id);
    }
    throw hasPrismaErrorCode(error, "P2002") ? duplicatePlate() : error;
  }
}

export async function deleteCar(id: number): Promise<void> {
  try {
    await db.car.delete({ where: { id } });
  } catch (error) {
    throw hasPrismaErrorCode(error, "P2025") ? carNotFound(id) : error;
  }
}
