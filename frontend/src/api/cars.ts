import { isCarStatus, type Car, type CarInput, type CarStatus } from "../types/car";
import { isRecord, requestJson, requestWithoutBody, type RequestOptions } from "./http";

export type ListCarsFilters = {
  search?: string;
  status?: CarStatus;
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || Number.isInteger(value);
}

export function isCar(value: unknown): value is Car {
  return (
    isRecord(value) &&
    Number.isInteger(value.id) &&
    typeof value.licensePlate === "string" &&
    typeof value.province === "string" &&
    typeof value.brand === "string" &&
    typeof value.model === "string" &&
    isNullableInteger(value.year) &&
    isNullableString(value.color) &&
    isCarStatus(value.status) &&
    isNullableInteger(value.mileage) &&
    isNullableString(value.note) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function isCarList(value: unknown): value is Car[] {
  return Array.isArray(value) && value.every(isCar);
}

function toRequestBody(input: CarInput): string {
  const body: CarInput = {
    licensePlate: input.licensePlate,
    province: input.province,
    brand: input.brand,
    model: input.model,
    year: input.year,
    color: input.color,
    status: input.status,
    mileage: input.mileage,
    note: input.note,
  };
  return JSON.stringify(body);
}

function carPath(id: number): string {
  return `/cars/${id}`;
}

export function listCars(
  filters: ListCarsFilters = {},
  options: RequestOptions = {},
): Promise<Car[]> {
  const query = new URLSearchParams();
  const search = filters.search?.trim();
  if (search) {
    query.set("search", search);
  }
  if (filters.status) {
    query.set("status", filters.status);
  }
  const queryString = query.toString();
  const path = queryString === "" ? "/cars" : `/cars?${queryString}`;
  return requestJson(path, isCarList, { signal: options.signal });
}

export function createCar(input: CarInput, options: RequestOptions = {}): Promise<Car> {
  return requestJson("/cars", isCar, {
    method: "POST",
    body: toRequestBody(input),
    signal: options.signal,
  });
}

export function updateCar(id: number, input: CarInput, options: RequestOptions = {}): Promise<Car> {
  return requestJson(carPath(id), isCar, {
    method: "PUT",
    body: toRequestBody(input),
    signal: options.signal,
  });
}

export function deleteCar(id: number, options: RequestOptions = {}): Promise<void> {
  return requestWithoutBody(carPath(id), { method: "DELETE", signal: options.signal });
}
