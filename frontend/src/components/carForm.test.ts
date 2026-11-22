import { describe, expect, it } from "vitest";
import { ApiError } from "../api/http";
import { buildCar } from "../test/fakeCarApi";
import { toCarFieldErrors, toCarFormValues, toCarInput } from "./carForm";

describe("toCarInput", () => {
  it("trims text and sends every field with null for blank optional values", () => {
    expect(
      toCarInput({
        licensePlate: "  กข 1234 ",
        province: " ภูเก็ต ",
        brand: " Mazda",
        model: "CX-3 ",
        year: undefined,
        color: "   ",
        status: "MAINTENANCE",
        mileage: undefined,
        note: "",
      }),
    ).toEqual({
      licensePlate: "กข 1234",
      province: "ภูเก็ต",
      brand: "Mazda",
      model: "CX-3",
      year: null,
      color: null,
      status: "MAINTENANCE",
      mileage: null,
      note: null,
    });
  });

  it("keeps filled optional values and defaults the status to AVAILABLE", () => {
    expect(
      toCarInput({
        licensePlate: "กข 1234",
        province: "ภูเก็ต",
        brand: "Mazda",
        model: "CX-3",
        year: 2022,
        color: " แดง ",
        mileage: 0,
        note: " รถผู้บริหาร ",
      }),
    ).toEqual({
      licensePlate: "กข 1234",
      province: "ภูเก็ต",
      brand: "Mazda",
      model: "CX-3",
      year: 2022,
      color: "แดง",
      status: "AVAILABLE",
      mileage: 0,
      note: "รถผู้บริหาร",
    });
  });
});

describe("toCarFormValues", () => {
  it("starts a new car as AVAILABLE with empty numbers", () => {
    expect(toCarFormValues(null)).toEqual({ status: "AVAILABLE", year: null, mileage: null });
  });

  it("prefills every editable field from an existing car", () => {
    const car = buildCar({ color: null, note: "เข้าศูนย์" });
    expect(toCarFormValues(car)).toEqual({
      licensePlate: car.licensePlate,
      province: car.province,
      brand: car.brand,
      model: car.model,
      year: car.year,
      color: null,
      status: car.status,
      mileage: car.mileage,
      note: "เข้าศูนย์",
    });
  });
});

describe("toCarFieldErrors", () => {
  it("puts the Thai duplicate message on the license plate for a 409", () => {
    const error = new ApiError(409, "A car with this license plate already exists");
    expect(toCarFieldErrors(error)).toEqual([
      { name: "licensePlate", errors: ["ทะเบียนนี้มีอยู่แล้วในจังหวัดนี้"] },
    ]);
  });

  it("maps each known 400 path to one Thai message and ignores unknown paths", () => {
    const error = new ApiError(400, "Validation failed", [
      { path: "brand", message: "Brand is required" },
      { path: "brand", message: "Brand must be at most 50 characters" },
      { path: "mileage", message: "Mileage cannot be negative" },
      { path: "", message: "Body must be an object" },
      { path: "unknownField", message: "Unrecognized key" },
    ]);
    const fieldErrors = toCarFieldErrors(error);

    expect(fieldErrors.map((fieldError) => fieldError.name)).toEqual(["brand", "mileage"]);
    for (const fieldError of fieldErrors) {
      expect(fieldError.errors).toHaveLength(1);
      expect(fieldError.errors[0]).toMatch(/[฀-๿]/);
      expect(fieldError.errors[0]).not.toMatch(/[A-Za-z]{3,}/);
    }
  });

  it("returns no field errors for statuses that are not about the form", () => {
    expect(toCarFieldErrors(new ApiError(404, "Car 1 not found"))).toEqual([]);
    expect(toCarFieldErrors(new ApiError(500, "Internal server error"))).toEqual([]);
  });
});
