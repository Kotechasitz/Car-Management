import { ApiError } from "../api/http";
import type { Car, CarInput, CarStatus } from "../types/car";
import { DUPLICATE_PLATE_MESSAGE } from "../utils/errorMessages";

export const CAR_FIELD_LIMITS = {
  licensePlate: 20,
  province: 100,
  brand: 50,
  model: 50,
  color: 30,
  note: 500,
} as const;

export const OLDEST_CAR_YEAR = 1950;
export const MAX_MILEAGE = 2_147_483_647;

export function latestAllowedCarYear(): number {
  return new Date().getFullYear() + 1;
}

export type CarFormValues = {
  licensePlate?: string;
  province?: string;
  brand?: string;
  model?: string;
  year?: number | null;
  color?: string | null;
  status?: CarStatus;
  mileage?: number | null;
  note?: string | null;
};

export type CarFieldName = keyof CarInput;

export type CarFieldError = {
  name: CarFieldName;
  errors: string[];
};

const CAR_FIELD_NAMES: readonly CarFieldName[] = [
  "licensePlate",
  "province",
  "brand",
  "model",
  "year",
  "color",
  "status",
  "mileage",
  "note",
];

function fieldErrorMessage(name: CarFieldName): string {
  switch (name) {
    case "licensePlate":
      return `กรุณากรอกทะเบียนรถ ไม่เกิน ${CAR_FIELD_LIMITS.licensePlate} ตัวอักษร`;
    case "province":
      return `กรุณาเลือกจังหวัด ไม่เกิน ${CAR_FIELD_LIMITS.province} ตัวอักษร`;
    case "brand":
      return `กรุณากรอกยี่ห้อ ไม่เกิน ${CAR_FIELD_LIMITS.brand} ตัวอักษร`;
    case "model":
      return `กรุณากรอกรุ่น ไม่เกิน ${CAR_FIELD_LIMITS.model} ตัวอักษร`;
    case "year":
      return `ปีต้องเป็นจำนวนเต็มระหว่าง ${OLDEST_CAR_YEAR} ถึง ${latestAllowedCarYear()}`;
    case "color":
      return `สีต้องไม่เกิน ${CAR_FIELD_LIMITS.color} ตัวอักษร`;
    case "status":
      return "กรุณาเลือกสถานะ";
    case "mileage":
      return "เลขไมล์ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป";
    case "note":
      return `หมายเหตุต้องไม่เกิน ${CAR_FIELD_LIMITS.note} ตัวอักษร`;
  }
}

function isCarFieldName(path: string): path is CarFieldName {
  return CAR_FIELD_NAMES.some((name) => name === path);
}

export function toCarFieldErrors(error: ApiError): CarFieldError[] {
  if (error.status === 409) {
    return [{ name: "licensePlate", errors: [DUPLICATE_PLATE_MESSAGE] }];
  }
  if (error.status !== 400) {
    return [];
  }
  const names = new Set(
    error.fieldErrors.map((fieldError) => fieldError.path).filter(isCarFieldName),
  );
  return [...names].map((name) => ({ name, errors: [fieldErrorMessage(name)] }));
}

export function toCarFormValues(car: Car | null): CarFormValues {
  if (car === null) {
    return { status: "AVAILABLE", year: null, mileage: null };
  }
  return {
    licensePlate: car.licensePlate,
    province: car.province,
    brand: car.brand,
    model: car.model,
    year: car.year,
    color: car.color,
    status: car.status,
    mileage: car.mileage,
    note: car.note,
  };
}

function trimmedText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function textOrNull(value: string | null | undefined): string | null {
  const trimmed = trimmedText(value);
  return trimmed === "" ? null : trimmed;
}

export function toCarInput(values: CarFormValues): CarInput {
  return {
    licensePlate: trimmedText(values.licensePlate),
    province: trimmedText(values.province),
    brand: trimmedText(values.brand),
    model: trimmedText(values.model),
    year: values.year ?? null,
    color: textOrNull(values.color),
    status: values.status ?? "AVAILABLE",
    mileage: values.mileage ?? null,
    note: textOrNull(values.note),
  };
}
