export const CAR_STATUSES = ["AVAILABLE", "IN_USE", "MAINTENANCE", "INACTIVE"] as const;

export type CarStatus = (typeof CAR_STATUSES)[number];

export type Car = {
  id: number;
  licensePlate: string;
  province: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  status: CarStatus;
  mileage: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CarInput = Omit<Car, "id" | "createdAt" | "updatedAt">;

export type CarStatusDisplay = {
  label: string;
  tagColor: string;
};

export const CAR_STATUS_DISPLAY: Readonly<Record<CarStatus, CarStatusDisplay>> = {
  AVAILABLE: { label: "ว่าง", tagColor: "success" },
  IN_USE: { label: "กำลังใช้งาน", tagColor: "processing" },
  MAINTENANCE: { label: "ซ่อมบำรุง", tagColor: "warning" },
  INACTIVE: { label: "เลิกใช้งาน", tagColor: "default" },
};

export function isCarStatus(value: unknown): value is CarStatus {
  return CAR_STATUSES.some((status) => status === value);
}
