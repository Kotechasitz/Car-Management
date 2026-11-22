import { useCallback, useEffect, useState } from "react";
import { listCars } from "../api/cars";
import type { Car, CarStatus } from "../types/car";
import { toThaiErrorMessage } from "../utils/errorMessages";

export type CarListFilters = {
  search: string;
  status: CarStatus | undefined;
};

type CarListResult = {
  requestKey: string;
  cars: Car[];
  errorMessage: string | null;
};

export type CarListState = {
  cars: Car[];
  isLoading: boolean;
  errorMessage: string | null;
  reload: () => void;
};

const LOAD_ERROR_MESSAGE = "โหลดข้อมูลรถไม่สำเร็จ";

function toRequestKey(reloadCount: number, search: string, status: CarStatus | undefined): string {
  return JSON.stringify([reloadCount, search, status ?? null]);
}

export function useCarList({ search, status }: CarListFilters): CarListState {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<CarListResult | null>(null);
  const requestKey = toRequestKey(reloadCount, search, status);

  useEffect(() => {
    const controller = new AbortController();
    const key = toRequestKey(reloadCount, search, status);

    listCars({ search, status }, { signal: controller.signal })
      .then((cars) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey: key, cars, errorMessage: null });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            requestKey: key,
            cars: [],
            errorMessage: toThaiErrorMessage(error, LOAD_ERROR_MESSAGE),
          });
        }
      });

    return () => controller.abort();
  }, [reloadCount, search, status]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const isCurrent = result?.requestKey === requestKey;

  return {
    cars: result?.cars ?? [],
    isLoading: !isCurrent,
    errorMessage: isCurrent ? result.errorMessage : null,
    reload,
  };
}
