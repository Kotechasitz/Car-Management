import { describe, expect, it, vi } from "vitest";
import { buildCar, jsonResponse } from "../test/fakeCarApi";
import type { CarInput } from "../types/car";
import { createCar, deleteCar, listCars, updateCar } from "./cars";
import { ApiError, NETWORK_ERROR_STATUS } from "./http";

const input: CarInput = {
  licensePlate: "กข 1234",
  province: "ภูเก็ต",
  brand: "Mazda",
  model: "CX-3",
  year: null,
  color: null,
  status: "AVAILABLE",
  mileage: 50000,
  note: "ทดสอบ",
};

function stubFetch(respond: () => Response | Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(async () => respond());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestAt(fetchMock: ReturnType<typeof stubFetch>, index = 0) {
  const [url, init] = fetchMock.mock.calls[index] ?? [];
  return {
    url: String(url),
    method: init?.method ?? "GET",
    body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
  };
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected the promise to reject");
}

describe("listCars", () => {
  it("returns the cars from the API", async () => {
    const cars = [buildCar({ id: 1 }), buildCar({ id: 2, licensePlate: "2กค 5678" })];
    stubFetch(() => jsonResponse(cars));

    await expect(listCars()).resolves.toEqual(cars);
  });

  it("sends only the filters that are set, with the search trimmed", async () => {
    const fetchMock = stubFetch(() => jsonResponse([]));

    await listCars({ search: "  Toyota ", status: "IN_USE" });
    await listCars({ search: "   " });

    expect(requestAt(fetchMock, 0).url).toBe("/api/cars?search=Toyota&status=IN_USE");
    expect(requestAt(fetchMock, 1).url).toBe("/api/cars");
  });

  it("rejects a response that is not a list of cars", async () => {
    stubFetch(() => jsonResponse([{ id: 1, licensePlate: "กข 1234", status: "SOLD" }]));

    const error = await rejectionOf(listCars());

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 200, fieldErrors: [] });
  });

  it("rethrows an abort instead of turning it into a network error", async () => {
    stubFetch(() => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });
    const controller = new AbortController();
    controller.abort();

    const error = await rejectionOf(listCars({}, { signal: controller.signal }));

    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: "AbortError" });
  });

  it("turns a network failure into a status 0 error", async () => {
    stubFetch(() => {
      throw new TypeError("Failed to fetch");
    });

    const error = await rejectionOf(listCars());

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: NETWORK_ERROR_STATUS,
      fieldErrors: [],
    });
  });
});

describe("createCar", () => {
  it("posts every field of the input as JSON", async () => {
    const created = buildCar({ id: 9 });
    const fetchMock = stubFetch(() => jsonResponse(created, 201));

    await expect(createCar(input)).resolves.toEqual(created);
    expect(requestAt(fetchMock)).toEqual({
      url: "/api/cars",
      method: "POST",
      body: input,
    });
  });

  it("exposes the status and field errors from an error body", async () => {
    stubFetch(() =>
      jsonResponse(
        {
          message: "A car with this license plate already exists in this province",
          errors: [{ path: "licensePlate", message: "Duplicate" }, { bad: "entry" }],
        },
        409,
      ),
    );

    const error = await rejectionOf(createCar(input));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      fieldErrors: [{ path: "licensePlate", message: "Duplicate" }],
    });
  });
});

describe("updateCar", () => {
  it("puts the whole record to the car's URL", async () => {
    const updated = buildCar({ id: 3, status: "MAINTENANCE" });
    const fetchMock = stubFetch(() => jsonResponse(updated));

    await expect(updateCar(3, { ...input, status: "MAINTENANCE" })).resolves.toEqual(updated);
    const request = requestAt(fetchMock);
    expect(request.url).toBe("/api/cars/3");
    expect(request.method).toBe("PUT");
    expect(Object.keys(request.body).sort()).toEqual([
      "brand",
      "color",
      "licensePlate",
      "mileage",
      "model",
      "note",
      "province",
      "status",
      "year",
    ]);
  });
});

describe("deleteCar", () => {
  it("resolves on 204 without reading a body", async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));

    await expect(deleteCar(4)).resolves.toBeUndefined();
    expect(requestAt(fetchMock)).toMatchObject({ url: "/api/cars/4", method: "DELETE" });
  });

  it("keeps the status of an error whose body is not JSON", async () => {
    stubFetch(() => new Response("<html>Bad gateway</html>", { status: 502 }));

    const error = await rejectionOf(deleteCar(4));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, fieldErrors: [] });
  });

  it("rejects with 404 when the car no longer exists", async () => {
    stubFetch(() => jsonResponse({ message: "Car 4 not found" }, 404));

    await expect(deleteCar(4)).rejects.toMatchObject({ status: 404 });
  });
});
