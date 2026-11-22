import { vi } from "vitest";
import type { Car, CarInput } from "../types/car";

export type RecordedRequest = {
  method: string;
  url: string;
  body: unknown;
};

const TIMESTAMP = "2026-11-22T00:00:00.000Z";

export function buildCar(overrides: Partial<Car> = {}): Car {
  return {
    id: 1,
    licensePlate: "1กข 1234",
    province: "กรุงเทพมหานคร",
    brand: "Toyota",
    model: "Camry",
    year: 2022,
    color: "ดำ",
    status: "AVAILABLE",
    mileage: 38500,
    note: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function matchesSearch(car: Car, search: string): boolean {
  const needle = search.toLowerCase();
  return [car.licensePlate, car.province, car.brand, car.model].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

function parseBody(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

function isCarInputBody(value: unknown): value is CarInput {
  return typeof value === "object" && value !== null && "licensePlate" in value;
}

export type InjectedFailure = {
  method: string;
  status: number | "network";
  body?: unknown;
};

const DUPLICATE_BODY = {
  message: "A car with this license plate already exists in this province",
  errors: [{ path: "licensePlate", message: "Duplicate license plate" }],
};

export function createFakeCarApi(initialCars: Car[]) {
  let cars = [...initialCars];
  let nextId = Math.max(0, ...cars.map((car) => car.id)) + 1;
  let failuresRemaining = 0;
  const injectedFailures: InjectedFailure[] = [];
  const methodsWithInvalidBody: string[] = [];
  const requests: RecordedRequest[] = [];

  function isTakenByAnotherCar(input: CarInput, ownId: number | undefined): boolean {
    return cars.some(
      (car) =>
        car.id !== ownId &&
        car.licensePlate === input.licensePlate &&
        car.province === input.province,
    );
  }

  function respond(method: string, url: URL, body: unknown): Response {
    const idMatch = /^\/api\/cars\/(\d+)$/.exec(url.pathname);
    const id = idMatch === null ? undefined : Number(idMatch[1]);
    const existing = cars.find((car) => car.id === id);

    if (method === "GET" && url.pathname === "/api/cars") {
      const search = url.searchParams.get("search");
      const status = url.searchParams.get("status");
      return jsonResponse(
        cars.filter(
          (car) =>
            (search === null || matchesSearch(car, search)) &&
            (status === null || car.status === status),
        ),
      );
    }
    if (method === "POST" && url.pathname === "/api/cars" && isCarInputBody(body)) {
      if (isTakenByAnotherCar(body, undefined)) {
        return jsonResponse(DUPLICATE_BODY, 409);
      }
      const created: Car = { ...body, id: nextId, createdAt: TIMESTAMP, updatedAt: TIMESTAMP };
      nextId += 1;
      cars = [created, ...cars];
      return jsonResponse(created, 201);
    }
    if (method === "PUT" && existing !== undefined && isCarInputBody(body)) {
      if (isTakenByAnotherCar(body, existing.id)) {
        return jsonResponse(DUPLICATE_BODY, 409);
      }
      const updated: Car = { ...existing, ...body };
      cars = cars.map((car) => (car.id === existing.id ? updated : car));
      return jsonResponse(updated);
    }
    if (method === "DELETE" && existing !== undefined) {
      cars = cars.filter((car) => car.id !== existing.id);
      return new Response(null, { status: 204 });
    }
    return jsonResponse({ message: `Car ${id ?? "?"} not found` }, 404);
  }

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const method = init?.method ?? "GET";
    const body = parseBody(init);
    requests.push({ method, url: `${url.pathname}${url.search}`, body });
    if (failuresRemaining > 0) {
      failuresRemaining -= 1;
      throw new TypeError("Failed to fetch");
    }
    const failureIndex = injectedFailures.findIndex((failure) => failure.method === method);
    if (failureIndex !== -1) {
      const [failure] = injectedFailures.splice(failureIndex, 1);
      if (failure?.status === "network") {
        throw new TypeError("Failed to fetch");
      }
      return jsonResponse(
        failure?.body ?? { message: "Internal server error" },
        failure?.status ?? 500,
      );
    }
    const response = respond(method, url, body);
    const invalidBodyIndex = methodsWithInvalidBody.indexOf(method);
    if (invalidBodyIndex !== -1 && response.ok) {
      methodsWithInvalidBody.splice(invalidBodyIndex, 1);
      return jsonResponse({ saved: true }, response.status);
    }
    return response;
  });

  return {
    fetchMock,
    requests,
    failNextRequests(count: number) {
      failuresRemaining = count;
    },
    failNext(failure: InjectedFailure) {
      injectedFailures.push(failure);
    },
    answerNextWithInvalidBody(method: string) {
      methodsWithInvalidBody.push(method);
    },
    removeCar(id: number) {
      cars = cars.filter((car) => car.id !== id);
    },
  };
}
