import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntApp, ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import { StrictMode } from "react";
import { vi } from "vitest";
import { CarListPage } from "../pages/CarListPage";
import type { Car } from "../types/car";
import { createFakeCarApi } from "./fakeCarApi";

export type TestUser = ReturnType<typeof userEvent.setup>;

const withoutMotion = { token: { motion: false } };

export type RenderCarListPageOptions = {
  isStrictMode?: boolean;
  failingRequests?: number;
};

export function renderCarListPage(
  cars: Car[],
  { isStrictMode = true, failingRequests = 0 }: RenderCarListPageOptions = {},
) {
  const api = createFakeCarApi(cars);
  api.failNextRequests(failingRequests);
  vi.stubGlobal("fetch", api.fetchMock);
  const user = userEvent.setup();
  const page = (
    <ConfigProvider locale={thTH} theme={withoutMotion}>
      <AntApp>
        <CarListPage />
      </AntApp>
    </ConfigProvider>
  );
  render(isStrictMode ? <StrictMode>{page}</StrictMode> : page);
  return { api, user };
}

export function findCarRow(plate: string) {
  return screen.findByRole("row", { name: new RegExp(plate) });
}

export function queryCarRow(plate: string) {
  return screen.queryByRole("row", { name: new RegExp(plate) });
}

export function dialogField(label: string) {
  return within(screen.getByRole("dialog")).getByLabelText(label);
}

export async function chooseOption(user: TestUser, label: string, optionText: string) {
  await user.click(dialogField(label));
  await user.click(await screen.findByTitle(optionText));
}

export async function chooseProvince(user: TestUser, province: string) {
  await user.type(dialogField("จังหวัด"), province);
  await user.click(await screen.findByTitle(province));
}

export async function clickDialogButton(user: TestUser, name: string) {
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name }));
}
