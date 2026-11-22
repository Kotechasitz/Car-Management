import { ApiError, NETWORK_ERROR_STATUS } from "../api/http";

export const CAR_NOT_FOUND_MESSAGE = "ไม่พบข้อมูลรถคันนี้ อาจถูกลบไปแล้ว";
export const DUPLICATE_PLATE_MESSAGE = "ทะเบียนนี้มีอยู่แล้วในจังหวัดนี้";

const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  400: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
  404: "ไม่พบข้อมูลที่ต้องการ",
  409: DUPLICATE_PLATE_MESSAGE,
  413: "ข้อมูลมีขนาดใหญ่เกินไป",
};

const NETWORK_ERROR_MESSAGE = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง";
const INVALID_RESPONSE_MESSAGE = "ข้อมูลที่ได้รับจากเซิร์ฟเวอร์ไม่ถูกต้อง";
const SERVER_ERROR_MESSAGE = "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้ง";

export function isApiErrorWithStatus(error: unknown, status: number): error is ApiError {
  return error instanceof ApiError && error.status === status;
}

export function toThaiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  if (error.status === NETWORK_ERROR_STATUS) {
    return NETWORK_ERROR_MESSAGE;
  }
  if (error.status >= 200 && error.status < 300) {
    return INVALID_RESPONSE_MESSAGE;
  }
  if (error.status >= 500) {
    return SERVER_ERROR_MESSAGE;
  }
  return STATUS_MESSAGES[error.status] ?? fallback;
}
