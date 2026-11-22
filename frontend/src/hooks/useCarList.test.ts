import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildCar, jsonResponse } from "../test/fakeCarApi";
import type { CarStatus } from "../types/car";
import { useCarList } from "./useCarList";

const availableCar = buildCar({ id: 1, licensePlate: "1กข 1234", status: "AVAILABLE" });
const maintenanceCar = buildCar({ id: 2, licensePlate: "บข 4421", status: "MAINTENANCE" });

describe("useCarList", () => {
  it("keeps the newest filter's result when an older request answers later", async () => {
    let answerSlowRequest: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        if (String(input).includes("status=MAINTENANCE")) {
          return new Promise<Response>((resolve) => {
            answerSlowRequest = resolve;
          });
        }
        return jsonResponse([availableCar]);
      }),
    );

    const { result, rerender } = renderHook(
      ({ status }: { status: CarStatus }) => useCarList({ search: "", status }),
      { initialProps: { status: "MAINTENANCE" } },
    );
    rerender({ status: "AVAILABLE" });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => answerSlowRequest(jsonResponse([maintenanceCar])));

    expect(result.current.cars).toEqual([availableCar]);
    expect(result.current.isLoading).toBe(false);
  });

  it("reports a Thai error and recovers on reload", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue(jsonResponse([availableCar]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCarList({ search: "", status: undefined }));

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง",
      ),
    );
    expect(result.current.cars).toEqual([]);

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.cars).toEqual([availableCar]));
    expect(result.current.errorMessage).toBeNull();
  });
});
