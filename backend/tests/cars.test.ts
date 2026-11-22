import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { db } from "../src/db.js";

type CarBody = Record<string, unknown>;

function carBody(overrides: CarBody = {}): CarBody {
  return {
    licensePlate: "กข 1234",
    province: "กรุงเทพมหานคร",
    brand: "Toyota",
    model: "Camry",
    year: 2022,
    color: "ดำ",
    status: "AVAILABLE",
    mileage: 38500,
    note: "รถผู้บริหาร",
    ...overrides,
  };
}

async function createCar(overrides: CarBody = {}): Promise<number> {
  const response = await request(app).post("/api/cars").send(carBody(overrides)).expect(201);
  const created: { id: number } = response.body;
  return created.id;
}

function errorPaths(body: { errors?: { path: string }[] }): string[] {
  return (body.errors ?? []).map((error) => error.path);
}

describe("GET /api/cars", () => {
  it("returns an empty array when there are no cars", async () => {
    const response = await request(app).get("/api/cars");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("orders cars by creation time, newest first, even after one is edited", async () => {
    const sharedFields = { province: "กรุงเทพมหานคร", brand: "Toyota", model: "Camry" };
    const newer = await db.car.create({
      data: { ...sharedFields, licensePlate: "กข 2222", createdAt: new Date("2025-06-01") },
    });
    const older = await db.car.create({
      data: { ...sharedFields, licensePlate: "กข 1234", createdAt: new Date("2025-01-01") },
    });
    await request(app)
      .put(`/api/cars/${older.id}`)
      .send(carBody({ color: "ขาว" }))
      .expect(200);

    const response = await request(app).get("/api/cars");

    expect(response.status).toBe(200);
    expect(response.body.map((car: { id: number }) => car.id)).toEqual([newer.id, older.id]);
  });

  it("matches the search term against plate, province, brand and model, ignoring case", async () => {
    const toyotaId = await createCar({ licensePlate: "กข 1111", brand: "Toyota", model: "Camry" });
    const hondaId = await createCar({ licensePlate: "กข 2222", brand: "Honda", model: "City" });
    const chonburiId = await createCar({
      licensePlate: "บข 4421",
      province: "ชลบุรี",
      brand: "Isuzu",
      model: "D-Max",
    });

    const searchIds = async (search: string) => {
      const response = await request(app).get("/api/cars").query({ search }).expect(200);
      return response.body.map((car: { id: number }) => car.id);
    };

    expect(await searchIds("TOYOTA")).toEqual([toyotaId]);
    expect(await searchIds("city")).toEqual([hondaId]);
    expect(await searchIds("ชลบุรี")).toEqual([chonburiId]);
    expect(await searchIds("  กข   2222 ")).toEqual([hondaId]);
  });

  it("returns an empty array when nothing matches the search", async () => {
    await createCar();

    const response = await request(app).get("/api/cars").query({ search: "Ferrari" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("treats % and _ in the search term as literal characters", async () => {
    await createCar();

    const percent = await request(app).get("/api/cars").query({ search: "%" });
    const underscore = await request(app).get("/api/cars").query({ search: "_" });

    expect(percent.body).toEqual([]);
    expect(underscore.body).toEqual([]);
  });

  it("filters by status and combines it with search", async () => {
    await createCar({ licensePlate: "กข 1111", brand: "Toyota", status: "AVAILABLE" });
    const inUseToyotaId = await createCar({
      licensePlate: "กข 2222",
      brand: "Toyota",
      status: "IN_USE",
    });
    const inUseHondaId = await createCar({
      licensePlate: "กข 3333",
      brand: "Honda",
      status: "IN_USE",
    });

    const byStatus = await request(app).get("/api/cars").query({ status: "IN_USE" }).expect(200);
    const byStatusAndSearch = await request(app)
      .get("/api/cars")
      .query({ status: "IN_USE", search: "toyota" })
      .expect(200);

    expect(byStatus.body.map((car: { id: number }) => car.id).sort()).toEqual(
      [inUseToyotaId, inUseHondaId].sort(),
    );
    expect(byStatusAndSearch.body.map((car: { id: number }) => car.id)).toEqual([inUseToyotaId]);
  });

  it("rejects an unknown status with 400", async () => {
    const response = await request(app).get("/api/cars").query({ status: "SOLD" });

    expect(response.status).toBe(400);
    expect(errorPaths(response.body)).toEqual(["status"]);
  });
});

describe("GET /api/cars/:id", () => {
  it("returns the car", async () => {
    const id = await createCar();

    const response = await request(app).get(`/api/cars/${id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id, ...carBody() });
  });

  it("returns 404 for an id that does not exist", async () => {
    const response = await request(app).get("/api/cars/9999");

    expect(response.status).toBe(404);
    expect(response.body.message).toEqual(expect.any(String));
  });

  it.each(["abc", "0", "-1", "1.5"])("returns 400 for the id %s", async (id) => {
    const response = await request(app).get(`/api/cars/${id}`);

    expect(response.status).toBe(400);
    expect(errorPaths(response.body)).toEqual(["id"]);
  });
});

describe("POST /api/cars", () => {
  it("creates the car and returns it with 201", async () => {
    const response = await request(app).post("/api/cars").send(carBody());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: expect.any(Number), ...carBody() });
    expect(await db.car.count()).toBe(1);
  });

  it("normalizes text, stores blank optional fields as null and defaults the status", async () => {
    const response = await request(app).post("/api/cars").send({
      licensePlate: "  กข   1234 ",
      province: " กรุงเทพมหานคร ",
      brand: " Toyota ",
      model: "Camry",
      year: "",
      color: "",
      mileage: "",
      note: "   ",
    });

    expect(response.status).toBe(201);
    const stored = await db.car.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(stored).toMatchObject({
      licensePlate: "กข 1234",
      province: "กรุงเทพมหานคร",
      brand: "Toyota",
      year: null,
      color: null,
      mileage: null,
      note: null,
      status: "AVAILABLE",
    });
  });

  it("defaults the status to AVAILABLE when it is omitted", async () => {
    const { status: _omitted, ...withoutStatus } = carBody();

    const response = await request(app).post("/api/cars").send(withoutStatus);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("AVAILABLE");
  });

  it("ignores fields the client may not set", async () => {
    const response = await request(app)
      .post("/api/cars")
      .send(carBody({ id: 999, createdAt: "2000-01-01T00:00:00.000Z" }));

    expect(response.status).toBe(201);
    expect(response.body.id).not.toBe(999);
    expect(response.body.createdAt).not.toBe("2000-01-01T00:00:00.000Z");
    expect(await db.car.findUnique({ where: { id: 999 } })).toBeNull();
  });

  it("returns 400 with a field error for each missing required field", async () => {
    const response = await request(app)
      .post("/api/cars")
      .send({ licensePlate: "กข 1234", province: "กรุงเทพมหานคร" });

    expect(response.status).toBe(400);
    expect(errorPaths(response.body).sort()).toEqual(["brand", "model"]);
    expect(await db.car.count()).toBe(0);
  });

  it("returns 400 for values outside the allowed ranges", async () => {
    const response = await request(app)
      .post("/api/cars")
      .send(
        carBody({
          licensePlate: "   ",
          year: 1900,
          status: "SOLD",
          mileage: -1,
          note: "x".repeat(501),
        }),
      );

    expect(response.status).toBe(400);
    expect(errorPaths(response.body).sort()).toEqual([
      "licensePlate",
      "mileage",
      "note",
      "status",
      "year",
    ]);
  });

  it("rejects a year after next year", async () => {
    const response = await request(app)
      .post("/api/cars")
      .send(carBody({ year: new Date().getFullYear() + 2 }));

    expect(response.status).toBe(400);
    expect(errorPaths(response.body)).toEqual(["year"]);
  });

  it("returns 409 on licensePlate when the plate already exists in the province", async () => {
    await createCar({ licensePlate: "กข 1234", province: "กรุงเทพมหานคร" });

    const response = await request(app)
      .post("/api/cars")
      .send(carBody({ licensePlate: " กข  1234", province: "กรุงเทพมหานคร", brand: "Honda" }));

    expect(response.status).toBe(409);
    expect(errorPaths(response.body)).toEqual(["licensePlate"]);
    expect(await db.car.count()).toBe(1);
  });

  it("allows the same plate in a different province", async () => {
    await createCar({ licensePlate: "กข 1234", province: "กรุงเทพมหานคร" });

    const response = await request(app)
      .post("/api/cars")
      .send(carBody({ licensePlate: "กข 1234", province: "เชียงใหม่" }));

    expect(response.status).toBe(201);
    expect(await db.car.count()).toBe(2);
  });
});

describe("PUT /api/cars/:id", () => {
  it("replaces the car and returns it", async () => {
    const id = await createCar();
    const replacement = carBody({
      model: "Corolla Cross",
      status: "MAINTENANCE",
      mileage: 40000,
      note: "เปลี่ยนยาง",
    });

    const response = await request(app).put(`/api/cars/${id}`).send(replacement);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id, ...replacement });
    expect(await db.car.findUniqueOrThrow({ where: { id } })).toMatchObject(replacement);
  });

  it("clears optional fields that are omitted", async () => {
    const id = await createCar({ status: "IN_USE" });

    const response = await request(app).put(`/api/cars/${id}`).send({
      licensePlate: "กข 1234",
      province: "กรุงเทพมหานคร",
      brand: "Toyota",
      model: "Camry",
      status: "IN_USE",
    });

    expect(response.status).toBe(200);
    expect(await db.car.findUniqueOrThrow({ where: { id } })).toMatchObject({
      year: null,
      color: null,
      mileage: null,
      note: null,
      status: "IN_USE",
    });
  });

  it("requires the status and leaves the car unchanged without it", async () => {
    const id = await createCar({ status: "IN_USE" });

    const response = await request(app)
      .put(`/api/cars/${id}`)
      .send({ licensePlate: "กข 1234", province: "กรุงเทพมหานคร", brand: "Toyota", model: "Camry" });

    expect(response.status).toBe(400);
    expect(errorPaths(response.body)).toEqual(["status"]);
    expect((await db.car.findUniqueOrThrow({ where: { id } })).status).toBe("IN_USE");
  });

  it("keeps the car's own plate without a conflict", async () => {
    const id = await createCar();

    const response = await request(app)
      .put(`/api/cars/${id}`)
      .send(carBody({ color: "ขาว" }));

    expect(response.status).toBe(200);
    expect(response.body.color).toBe("ขาว");
  });

  it("returns 404 for an id that does not exist", async () => {
    const response = await request(app).put("/api/cars/9999").send(carBody());

    expect(response.status).toBe(404);
    expect(await db.car.count()).toBe(0);
  });

  it("returns 409 when the new plate belongs to another car in the same province", async () => {
    await createCar({ licensePlate: "กข 1111" });
    const otherId = await createCar({ licensePlate: "กข 2222" });

    const response = await request(app)
      .put(`/api/cars/${otherId}`)
      .send(carBody({ licensePlate: "กข 1111" }));

    expect(response.status).toBe(409);
    expect(errorPaths(response.body)).toEqual(["licensePlate"]);
    expect((await db.car.findUniqueOrThrow({ where: { id: otherId } })).licensePlate).toBe(
      "กข 2222",
    );
  });

  it("returns 400 for an invalid body and leaves the car unchanged", async () => {
    const id = await createCar();

    const response = await request(app)
      .put(`/api/cars/${id}`)
      .send(carBody({ brand: "", mileage: -5 }));

    expect(response.status).toBe(400);
    expect(errorPaths(response.body).sort()).toEqual(["brand", "mileage"]);
    expect((await db.car.findUniqueOrThrow({ where: { id } })).brand).toBe("Toyota");
  });

  it("returns 400 for an invalid id", async () => {
    const response = await request(app).put("/api/cars/abc").send(carBody());

    expect(response.status).toBe(400);
    expect(errorPaths(response.body)).toEqual(["id"]);
  });
});

describe("DELETE /api/cars/:id", () => {
  it("deletes the car with 204, then answers 404", async () => {
    const id = await createCar();

    const deleted = await request(app).delete(`/api/cars/${id}`);

    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");
    expect(await db.car.count()).toBe(0);
    expect((await request(app).get(`/api/cars/${id}`)).status).toBe(404);
    expect((await request(app).delete(`/api/cars/${id}`)).status).toBe(404);
  });

  it("returns 400 for an invalid id", async () => {
    const response = await request(app).delete("/api/cars/abc");

    expect(response.status).toBe(400);
    expect(errorPaths(response.body)).toEqual(["id"]);
  });
});

describe("request errors", () => {
  it("returns 400 JSON for a malformed JSON body", async () => {
    const response = await request(app)
      .post("/api/cars")
      .set("Content-Type", "application/json")
      .send('{"brand": "Toyota",');

    expect(response.status).toBe(400);
    expect(response.type).toBe("application/json");
    expect(response.body.message).toEqual(expect.any(String));
  });

  it("returns 413 for a body over the size limit", async () => {
    const response = await request(app)
      .post("/api/cars")
      .send(carBody({ note: "x".repeat(200_000) }));

    expect(response.status).toBe(413);
  });

  it.each(["%E0", "%"])(
    "returns 400 JSON without echoing the input for the undecodable id %s",
    async (id) => {
      const response = await request(app).get(`/api/cars/${id}`);

      expect(response.status).toBe(400);
      expect(response.type).toBe("application/json");
      expect(response.body.message).toEqual(expect.any(String));
      expect(response.body.message).not.toContain(id);
    },
  );

  it("returns 404 JSON for an unknown route", async () => {
    const response = await request(app).get("/api/nope");

    expect(response.status).toBe(404);
    expect(response.type).toBe("application/json");
    expect(response.body.message).toEqual(expect.any(String));
  });
});
