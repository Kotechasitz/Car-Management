import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildCar } from "../test/fakeCarApi";
import {
  chooseProvince,
  clickDialogButton,
  dialogField,
  findCarRow,
  queryCarRow,
  renderCarListPage,
  type TestUser,
} from "../test/renderCarListPage";
import type { Car } from "../types/car";

const seedCars: Car[] = [
  buildCar({ id: 2, licensePlate: "บข 4421", province: "ชลบุรี", brand: "Isuzu", model: "D-Max" }),
  buildCar({
    id: 1,
    licensePlate: "1กข 1234",
    province: "กรุงเทพมหานคร",
    brand: "Toyota",
    model: "Camry",
    status: "MAINTENANCE",
    mileage: 112300,
  }),
];

type RequiredFields = {
  plate: string;
  province: string;
  brand: string;
  model: string;
};

async function fillRequiredFields(user: TestUser, values: RequiredFields) {
  await user.type(dialogField("ทะเบียนรถ"), values.plate);
  await chooseProvince(user, values.province);
  await user.type(dialogField("ยี่ห้อ"), values.brand);
  await user.type(dialogField("รุ่น"), values.model);
}

async function openAddDialog(user: TestUser) {
  await user.click(screen.getByRole("button", { name: /เพิ่มรถ/ }));
  await screen.findByRole("dialog");
}

async function confirmDelete(user: TestUser, plateWithProvince: string) {
  const row = await findCarRow(plateWithProvince.split(" ").slice(0, 2).join(" "));
  await user.click(within(row).getByRole("button", { name: `ลบ ${plateWithProvince}` }));
  const confirm = await screen.findByRole("tooltip");
  expect(confirm).toHaveTextContent(`ยืนยันการลบรถทะเบียน ${plateWithProvince}?`);
  await user.click(within(confirm).getByRole("button", { name: "ลบ" }));
}

function lastListUrl(requests: { method: string; url: string }[]) {
  return requests.filter((request) => request.method === "GET").at(-1)?.url;
}

describe("CarListPage", () => {
  it("shows the cars returned by the API with Thai status and formatted mileage", async () => {
    renderCarListPage(seedCars);

    const row = await findCarRow("1กข 1234");

    expect(within(row).getByText("กรุงเทพมหานคร")).toBeInTheDocument();
    expect(within(row).getByText("Toyota")).toBeInTheDocument();
    expect(within(row).getByText("ซ่อมบำรุง")).toBeInTheDocument();
    expect(within(row).getByText("112,300 กม.")).toBeInTheDocument();
    expect(await findCarRow("บข 4421")).toBeInTheDocument();
  });

  it("names each row's buttons after the car they act on", async () => {
    renderCarListPage(seedCars);

    const row = await findCarRow("บข 4421");

    expect(within(row).getByRole("button", { name: "แก้ไข บข 4421 ชลบุรี" })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "ลบ บข 4421 ชลบุรี" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แก้ไข 1กข 1234 กรุงเทพมหานคร" })).toBeInTheDocument();
  });

  it("tells the user when there are no cars yet", async () => {
    renderCarListPage([]);

    expect(await screen.findByText("ยังไม่มีข้อมูลรถ")).toBeInTheDocument();
  });

  it("shows a Thai error with a retry that reloads the list", async () => {
    const { api, user } = renderCarListPage(seedCars, { failingRequests: 5 });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    expect(queryCarRow("1กข 1234")).not.toBeInTheDocument();
    api.failNextRequests(0);

    await user.click(within(alert).getByRole("button", { name: /ลองใหม่/ }));

    expect(await findCarRow("1กข 1234")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("filters the list by the search text after the user stops typing", async () => {
    const { api, user } = renderCarListPage(seedCars);
    await findCarRow("บข 4421");

    await user.type(screen.getByRole("textbox", { name: "ค้นหารถ" }), "Isuzu");

    await waitFor(() => expect(queryCarRow("1กข 1234")).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(queryCarRow("บข 4421")).toBeInTheDocument();
    expect(lastListUrl(api.requests)).toBe("/api/cars?search=Isuzu");
  });

  it("tells the user the search also covers the province", async () => {
    const { user } = renderCarListPage(seedCars);
    await findCarRow("บข 4421");
    const searchBox = screen.getByRole("textbox", { name: "ค้นหารถ" });

    expect(searchBox).toHaveAttribute("placeholder", expect.stringContaining("จังหวัด"));
    await user.type(searchBox, "ชลบุรี");

    await waitFor(() => expect(queryCarRow("1กข 1234")).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(queryCarRow("บข 4421")).toBeInTheDocument();
  });

  it("narrows the list to the chosen status and back to all", async () => {
    const { api, user } = renderCarListPage(seedCars);
    await findCarRow("บข 4421");

    await user.click(screen.getByRole("combobox", { name: "กรองตามสถานะ" }));
    await user.click(await screen.findByTitle("ซ่อมบำรุง"));

    await waitFor(() => expect(queryCarRow("บข 4421")).not.toBeInTheDocument());
    expect(queryCarRow("1กข 1234")).toBeInTheDocument();
    expect(lastListUrl(api.requests)).toBe("/api/cars?status=MAINTENANCE");

    await user.click(screen.getByRole("combobox", { name: "กรองตามสถานะ" }));
    await user.click(await screen.findByTitle("ทั้งหมด"));

    expect(await findCarRow("บข 4421")).toBeInTheDocument();
    expect(lastListUrl(api.requests)).toBe("/api/cars");
  });

  it("adds a car and shows it in the list", async () => {
    const { api, user } = renderCarListPage(seedCars);
    await findCarRow("บข 4421");

    await openAddDialog(user);
    await fillRequiredFields(user, {
      plate: "ทดสอบ 4321",
      province: "ภูเก็ต",
      brand: "Mazda",
      model: "CX-3",
    });
    await clickDialogButton(user, "บันทึก");

    expect(await screen.findByText("เพิ่มรถทะเบียน ทดสอบ 4321 ภูเก็ต แล้ว")).toBeInTheDocument();
    expect(await findCarRow("ทดสอบ 4321")).toBeInTheDocument();
    expect(api.requests.find((request) => request.method === "POST")?.body).toEqual({
      licensePlate: "ทดสอบ 4321",
      province: "ภูเก็ต",
      brand: "Mazda",
      model: "CX-3",
      year: null,
      color: null,
      status: "AVAILABLE",
      mileage: null,
      note: null,
    });
  });

  it("treats a saved car as saved even when the response body is unreadable", async () => {
    const { api, user } = renderCarListPage(seedCars);
    await findCarRow("บข 4421");
    api.answerNextWithInvalidBody("POST");

    await openAddDialog(user);
    await fillRequiredFields(user, {
      plate: "ทดสอบ 4321",
      province: "ภูเก็ต",
      brand: "Mazda",
      model: "CX-3",
    });
    await clickDialogButton(user, "บันทึก");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("เพิ่มรถทะเบียน ทดสอบ 4321 ภูเก็ต แล้ว")).toBeInTheDocument();
    expect(await findCarRow("ทดสอบ 4321")).toBeInTheDocument();
    expect(screen.queryByText("ข้อมูลที่ได้รับจากเซิร์ฟเวอร์ไม่ถูกต้อง")).not.toBeInTheDocument();
    expect(api.requests.filter((request) => request.method === "POST")).toHaveLength(1);
  });

  it("shows the Thai required-field messages and sends nothing when the form is empty", async () => {
    const { api, user } = renderCarListPage(seedCars);
    await findCarRow("บข 4421");

    await openAddDialog(user);
    await clickDialogButton(user, "บันทึก");

    await waitFor(() =>
      expect(dialogField("ทะเบียนรถ")).toHaveAccessibleDescription("กรุณากรอกทะเบียนรถ"),
    );
    expect(dialogField("จังหวัด")).toHaveAccessibleDescription("กรุณาเลือกจังหวัด");
    expect(dialogField("ยี่ห้อ")).toHaveAccessibleDescription("กรุณากรอกยี่ห้อ");
    expect(dialogField("รุ่น")).toHaveAccessibleDescription("กรุณากรอกรุ่น");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(api.requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("puts the server's validation errors under the matching fields", async () => {
    const { api, user } = renderCarListPage(seedCars);
    await findCarRow("บข 4421");
    api.failNext({
      method: "POST",
      status: 400,
      body: {
        message: "Validation failed",
        errors: [
          { path: "brand", message: "Too long" },
          { path: "mileage", message: "Must be a non-negative integer" },
          { path: "unknownField", message: "Ignored" },
        ],
      },
    });

    await openAddDialog(user);
    await fillRequiredFields(user, {
      plate: "ทดสอบ 4321",
      province: "ภูเก็ต",
      brand: "Mazda",
      model: "CX-3",
    });
    await clickDialogButton(user, "บันทึก");

    await waitFor(() =>
      expect(dialogField("ยี่ห้อ")).toHaveAccessibleDescription(/^กรุณากรอกยี่ห้อ ไม่เกิน \d+ ตัวอักษร$/),
    );
    expect(dialogField("เลขไมล์ (กม.)")).toHaveAccessibleDescription(
      "เลขไมล์ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป",
    );
    expect(dialogField("ทะเบียนรถ")).not.toHaveAccessibleDescription();
    expect(dialogField("รุ่น")).not.toHaveAccessibleDescription();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(queryCarRow("ทดสอบ 4321")).not.toBeInTheDocument();
  });

  it("shows the duplicate plate error under the plate field and keeps the form open", async () => {
    const { user } = renderCarListPage(seedCars);
    await findCarRow("บข 4421");

    await openAddDialog(user);
    await fillRequiredFields(user, {
      plate: "บข 4421",
      province: "ชลบุรี",
      brand: "Honda",
      model: "City",
    });
    await clickDialogButton(user, "บันทึก");

    await waitFor(() =>
      expect(dialogField("ทะเบียนรถ")).toHaveAccessibleDescription("ทะเบียนนี้มีอยู่แล้วในจังหวัดนี้"),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(dialogField("ทะเบียนรถ")).toHaveValue("บข 4421");
  });

  it("deletes a car after confirmation and removes it from the list", async () => {
    const { api, user } = renderCarListPage(seedCars);

    await confirmDelete(user, "บข 4421 ชลบุรี");

    expect(await screen.findByText("ลบรถทะเบียน บข 4421 ชลบุรี แล้ว")).toBeInTheDocument();
    await waitFor(() => expect(queryCarRow("บข 4421")).not.toBeInTheDocument());
    expect(api.requests).toContainEqual({ method: "DELETE", url: "/api/cars/2", body: undefined });
  });

  it("explains in Thai when the car was already deleted and refreshes the list", async () => {
    const { api, user } = renderCarListPage(seedCars);
    await findCarRow("บข 4421");
    api.removeCar(2);

    await confirmDelete(user, "บข 4421 ชลบุรี");

    expect(await screen.findByText("ไม่พบข้อมูลรถคันนี้ อาจถูกลบไปแล้ว")).toBeInTheDocument();
    await waitFor(() => expect(queryCarRow("บข 4421")).not.toBeInTheDocument());
  });
});
