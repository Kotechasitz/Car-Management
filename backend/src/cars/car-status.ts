export const CAR_STATUSES = ["AVAILABLE", "IN_USE", "MAINTENANCE", "INACTIVE"] as const;

export type CarStatus = (typeof CAR_STATUSES)[number];
