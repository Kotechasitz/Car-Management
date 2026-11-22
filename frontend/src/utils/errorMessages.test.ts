import { describe, expect, it } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "../api/http";
import { isApiErrorWithStatus, toThaiErrorMessage } from "./errorMessages";

const FALLBACK = "บันทึกข้อมูลไม่สำเร็จ";

describe("toThaiErrorMessage", () => {
  it.each([
    [400, "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"],
    [404, "ไม่พบข้อมูลที่ต้องการ"],
    [409, "ทะเบียนนี้มีอยู่แล้วในจังหวัดนี้"],
    [413, "ข้อมูลมีขนาดใหญ่เกินไป"],
    [500, "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้ง"],
    [503, "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้ง"],
  ])("shows Thai text for HTTP %i instead of the English server message", (status, expected) => {
    expect(toThaiErrorMessage(new ApiError(status, "English server message"), FALLBACK)).toBe(
      expected,
    );
  });

  it("uses the fallback for an unmapped client error status", () => {
    expect(toThaiErrorMessage(new ApiError(418, "I'm a teapot"), FALLBACK)).toBe(FALLBACK);
  });

  it("shows Thai text for a network failure and for an unreadable success body", () => {
    expect(
      toThaiErrorMessage(new ApiError(NETWORK_ERROR_STATUS, "Network request failed"), FALLBACK),
    ).toBe("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง");
    expect(toThaiErrorMessage(new ApiError(200, "Unexpected response body"), FALLBACK)).toBe(
      "ข้อมูลที่ได้รับจากเซิร์ฟเวอร์ไม่ถูกต้อง",
    );
  });

  it("shows the server-down text for a 5xx whose body was not JSON", () => {
    expect(toThaiErrorMessage(new ApiError(502, "HTTP 502"), FALLBACK)).toBe(
      "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้ง",
    );
  });

  it("uses the fallback for errors that are not API errors", () => {
    expect(toThaiErrorMessage(new Error("boom"), FALLBACK)).toBe(FALLBACK);
    expect(toThaiErrorMessage("boom", FALLBACK)).toBe(FALLBACK);
  });
});

describe("isApiErrorWithStatus", () => {
  it("matches only an ApiError with that exact status", () => {
    expect(isApiErrorWithStatus(new ApiError(404, "x"), 404)).toBe(true);
    expect(isApiErrorWithStatus(new ApiError(409, "x"), 404)).toBe(false);
    expect(isApiErrorWithStatus(new Error("x"), 404)).toBe(false);
  });
});
