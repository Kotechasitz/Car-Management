import type { Car } from "../types/car";

export const EMPTY_VALUE_PLACEHOLDER = "-";

const mileageFormatter = new Intl.NumberFormat("th-TH");

export function formatMileage(mileage: number | null): string {
  return mileage === null ? EMPTY_VALUE_PLACEHOLDER : `${mileageFormatter.format(mileage)} กม.`;
}

export function formatPlate(car: Pick<Car, "licensePlate" | "province">): string {
  return `${car.licensePlate} ${car.province}`;
}
