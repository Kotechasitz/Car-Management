import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildCar } from "../test/fakeCarApi";
import {
  chooseOption,
  chooseProvince,
  clickDialogButton,
  dialogField,
  findCarRow,
  queryCarRow,
  renderCarListPage,
  type TestUser,
} from "../test/renderCarListPage";
import type { Car } from "../types/car";

const NETWORK_MESSAGE = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง";
const SERVER_MESSAGE = "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้ง";
const NOT_FOUND_MESSAGE = "ไม่พบข้อมูลรถคันนี้ อาจถูกลบไปแล้ว";
const DUPLICATE_MESSAGE = "ทะเบียนนี้มีอยู่แล้วในจังหวัดนี้";

const pickup = buildCar({
  id: 2,
  licensePlate: "บข 4421",
  province: "ชลบุรี",
  brand: "Isuzu",
  model: "D-Max",
  year: 2020,
  color: "เทา",
  status: "AVAILABLE",
  mileage: 112300,
  note: null,
});
const sedan = buildCar({
  id: 1,
  licensePlate: "1กข 1234",
  province: "กรุงเทพมหานคร",
  brand: "Toyota",
  model: "Camry",
});
const seedCars: Car[] = [pickup, sedan];

async function openEdit(user: TestUser, plate: string) {
  const row = await findCarRow(plate);
  await user.click(within(row).getByRole("button", { name: new RegExp(`^แก้ไข ${plate} `) }));
  await screen.findByRole("dialog");
}

async function openAddWithRequiredFields(user: TestUser) {
  await user.click(screen.getByRole("button", { name: /เพิ่มรถ/ }));
  await user.type(dialogField("ทะเบียนรถ"), "ทดสอบ 4321");
  await chooseProvince(user, "ภูเก็ต");
  await user.type(dialogField("ยี่ห้อ"), "Mazda");
  await user.type(dialogField("รุ่น"), "CX-3");
}

async function confirmDelete(user: TestUser, plate: string) {
  const row = await findCarRow(plate);
  await user.click(within(row).getByRole("button", { name: new RegExp(`^ลบ ${plate} `) }));
  const confirm = await screen.findByRole("tooltip");
  await user.click(within(confirm).getByRole("button", { name: "ลบ" }));
}

function waitForDialogToClose() {
  return waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

describe("CarListPage editing", () => {
  it("prefills the form, sends the whole record and shows the update", async () => {
    const { api, user } = renderCarListPage(seedCars);
    await openEdit(user, "บข 4421");

    expect(screen.getByRole("dialog")).toHaveTextContent("แก้ไขข้อมูลรถ");
    expect(dialogField("ทะเบียนรถ")).toHaveValue("บข 4421");
    expect(dialogField("ยี่ห้อ")).toHaveValue("Isuzu");
    expect(dialogField("เลขไมล์ (กม.)")).toHaveValue("112,300");

    await user.clear(dialogField("ยี่ห้อ"));
    await user.type(dialogField("ยี่ห้อ"), "Mitsubishi");
    await chooseOption(user, "สถานะ", "กำลังใช้งาน");
    await clickDialogButton(user, "บันทึก");

    expect(await screen.findByText("บันทึกข้อมูลรถทะเบียน บข 4421 ชลบุรี แล้ว")).toBeInTheDocument();
    await waitForDialogToClose();
    const row = await findCarRow("บข 4421");
    await waitFor(() => expect(within(row).getByText("Mitsubishi")).toBeInTheDocument());
    expect(within(row).getByText("กำลังใช้งาน")).toBeInTheDocument();
    expect(api.requests.find((request) => request.method === "PUT")).toEqual({
      method: "PUT",
      url: "/api/cars/2",
      body: {
        licensePlate: "บข 4421",
        province: "ชลบุรี",
        brand: "Mitsubishi",
        model: "D-Max",
        year: 2020,
        color: "เทา",
        status: "IN_USE",
        mileage: 112300,
        note: null,
      },
    });
  });

  it("treats an update as saved even when the response body is unreadable", async () => {
    const { api, user } = renderCarListPage(seedCars);
    await openEdit(user, "บข 4421");
    api.answerNextWithInvalidBody("PUT");

    await user.clear(dialogField("ยี่ห้อ"));
    await user.type(dialogField("ยี่ห้อ"), "Mitsubishi");
    await clickDialogButton(user, "บันทึก");

    await waitForDialogToClose();
    expect(await screen.findByText("บันทึกข้อมูลรถทะเบียน บข 4421 ชลบุรี แล้ว")).toBeInTheDocument();
    const row = await findCarRow("บข 4421");
    await waitFor(() => expect(within(row).getByText("Mitsubishi")).toBeInTheDocument());
    expect(api.requests.filter((request) => request.method === "PUT")).toHaveLength(1);
  });

  it("closes the form with a Thai message and refreshes when the car was deleted meanwhile", async () => {
    const { api, user } = renderCarListPage(seedCars);
    await openEdit(user, "บข 4421");
    api.removeCar(2);

    await clickDialogButton(user, "บันทึก");

    expect(await screen.findByText(NOT_FOUND_MESSAGE)).toBeInTheDocument();
    await waitForDialogToClose();
    await waitFor(() => expect(queryCarRow("บข 4421")).not.toBeInTheDocument());
    expect(queryCarRow("1กข 1234")).toBeInTheDocument();
  });

  it("shows the duplicate plate message under the plate field when editing into a taken plate", async () => {
    const { user } = renderCarListPage(seedCars);
    await openEdit(user, "บข 4421");

    await user.clear(dialogField("ทะเบียนรถ"));
    await user.type(dialogField("ทะเบียนรถ"), "1กข 1234");
    await chooseProvince(user, "กรุงเทพมหานคร");
    await clickDialogButton(user, "บันทึก");

    await waitFor(() =>
      expect(dialogField("ทะเบียนรถ")).toHaveAccessibleDescription(DUPLICATE_MESSAGE),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("แก้ไขข้อมูลรถ");
  });
});

describe("CarListPage save failures", () => {
  it.each([
    ["a network failure", "network" as const, NETWORK_MESSAGE],
    ["a server error", 500, SERVER_MESSAGE],
  ])("keeps the form open with its values after %s", async (_, status, expectedMessage) => {
    const { api, user } = renderCarListPage(seedCars);
    await findCarRow("บข 4421");
    api.failNext({ method: "POST", status });

    await openAddWithRequiredFields(user);
    await clickDialogButton(user, "บันทึก");

    expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(dialogField("ทะเบียนรถ")).toHaveValue("ทดสอบ 4321");
    expect(queryCarRow("ทดสอบ 4321")).not.toBeInTheDocument();
  });
});

describe("CarListPage delete failures", () => {
  it.each([
    ["a network failure", "network" as const, NETWORK_MESSAGE],
    ["a server error", 500, SERVER_MESSAGE],
  ])("keeps the row and explains in Thai after %s", async (_, status, expectedMessage) => {
    const { api, user } = renderCarListPage(seedCars);
    api.failNext({ method: "DELETE", status });

    await confirmDelete(user, "บข 4421");

    expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
    expect(queryCarRow("บข 4421")).toBeInTheDocument();
  });
});

describe.each([
  ["with StrictMode", true],
  ["without StrictMode", false],
])("CarListPage form reuse %s", (_, isStrictMode) => {
  it("starts an add form empty after a cancelled add", async () => {
    const { user } = renderCarListPage(seedCars, { isStrictMode });
    await findCarRow("บข 4421");

    await openAddWithRequiredFields(user);
    await clickDialogButton(user, "ยกเลิก");
    await waitForDialogToClose();
    await user.click(screen.getByRole("button", { name: /เพิ่มรถ/ }));

    expect(dialogField("ทะเบียนรถ")).toHaveValue("");
    expect(dialogField("ยี่ห้อ")).toHaveValue("");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("ภูเก็ต");
  });

  it("starts an add form empty after a cancelled edit", async () => {
    const { user } = renderCarListPage(seedCars, { isStrictMode });
    await openEdit(user, "บข 4421");

    await clickDialogButton(user, "ยกเลิก");
    await waitForDialogToClose();
    await user.click(screen.getByRole("button", { name: /เพิ่มรถ/ }));

    expect(screen.getByRole("dialog")).toHaveTextContent("เพิ่มรถ");
    expect(dialogField("ทะเบียนรถ")).toHaveValue("");
    expect(dialogField("ยี่ห้อ")).toHaveValue("");
    expect(dialogField("เลขไมล์ (กม.)")).toHaveValue("");
  });

  it("prefills an edit form again after an add was cancelled", async () => {
    const { user } = renderCarListPage(seedCars, { isStrictMode });
    await openEdit(user, "บข 4421");
    await clickDialogButton(user, "ยกเลิก");
    await waitForDialogToClose();
    await user.click(screen.getByRole("button", { name: /เพิ่มรถ/ }));
    await clickDialogButton(user, "ยกเลิก");
    await waitForDialogToClose();

    await openEdit(user, "บข 4421");

    expect(dialogField("ทะเบียนรถ")).toHaveValue("บข 4421");
    expect(dialogField("ยี่ห้อ")).toHaveValue("Isuzu");
    expect(dialogField("เลขไมล์ (กม.)")).toHaveValue("112,300");
  });

  it("keeps the form open while the province list is used", async () => {
    const { user } = renderCarListPage(seedCars, { isStrictMode });
    await findCarRow("บข 4421");

    await user.click(screen.getByRole("button", { name: /เพิ่มรถ/ }));
    await user.type(dialogField("ทะเบียนรถ"), "ทด 9999");
    await user.click(dialogField("จังหวัด"));

    expect(await screen.findByTitle("กรุงเทพมหานคร")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(dialogField("ทะเบียนรถ")).toHaveValue("ทด 9999");
  });
});
