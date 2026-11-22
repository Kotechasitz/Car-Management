import { describe, expect, it } from "vitest";
import { formatMileage, formatPlate } from "./carFormat";

describe("formatMileage", () => {
  it("adds thousands separators and the km unit", () => {
    expect(formatMileage(112300)).toBe("112,300 กม.");
    expect(formatMileage(1234567)).toBe("1,234,567 กม.");
  });

  it("shows zero as a real reading", () => {
    expect(formatMileage(0)).toBe("0 กม.");
  });

  it("shows a dash when the mileage is unknown", () => {
    expect(formatMileage(null)).toBe("-");
  });
});

describe("formatPlate", () => {
  it("joins the plate and province", () => {
    expect(formatPlate({ licensePlate: "บข 4421", province: "ชลบุรี" })).toBe("บข 4421 ชลบุรี");
  });
});
