import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, App, Button, Flex, Input, Select, Typography, theme } from "antd";
import { useState, type ChangeEvent } from "react";
import { deleteCar } from "../api/cars";
import { CarFormModal } from "../components/CarFormModal";
import { CarTable } from "../components/CarTable";
import { useCarList } from "../hooks/useCarList";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { CAR_STATUSES, CAR_STATUS_DISPLAY, isCarStatus, type Car } from "../types/car";
import { formatPlate } from "../utils/carFormat";
import {
  CAR_NOT_FOUND_MESSAGE,
  isApiErrorWithStatus,
  toThaiErrorMessage,
} from "../utils/errorMessages";

type FormModalState = {
  isOpen: boolean;
  car: Car | null;
  sessionId: number;
};

const ALL_STATUSES = "ALL";
const SEARCH_DEBOUNCE_MS = 400;
const DELETE_ERROR_MESSAGE = "ลบข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

const statusFilterOptions = [
  { value: ALL_STATUSES, label: "ทั้งหมด" },
  ...CAR_STATUSES.map((status) => ({ value: status, label: CAR_STATUS_DISPLAY[status].label })),
];
const searchInputStyle = { width: 300, maxWidth: "100%" };
const statusSelectStyle = { width: 180 };

export function CarListPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const pageTitleStyle = {
    margin: 0,
    fontSize: token.fontSizeHeading4,
    lineHeight: token.lineHeightHeading4,
  };
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [formModal, setFormModal] = useState<FormModalState>({
    isOpen: false,
    car: null,
    sessionId: 0,
  });
  const search = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const status = isCarStatus(statusFilter) ? statusFilter : undefined;
  const { cars, isLoading, errorMessage, reload } = useCarList({ search, status });
  const hasFilters = search !== "" || status !== undefined;

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearchText(event.target.value);
  }

  function openFormModal(car: Car | null): void {
    setFormModal((current) => ({ isOpen: true, car, sessionId: current.sessionId + 1 }));
  }

  function openCreateModal(): void {
    openFormModal(null);
  }

  function closeFormModal(): void {
    setFormModal((current) => ({ ...current, isOpen: false }));
  }

  function handleSaved(savedCar: Pick<Car, "licensePlate" | "province">, isNew: boolean): void {
    closeFormModal();
    const plate = formatPlate(savedCar);
    void message.success(isNew ? `เพิ่มรถทะเบียน ${plate} แล้ว` : `บันทึกข้อมูลรถทะเบียน ${plate} แล้ว`);
    reload();
  }

  function handleCarMissing(): void {
    closeFormModal();
    reload();
  }

  async function handleDelete(car: Car): Promise<void> {
    try {
      await deleteCar(car.id);
      void message.success(`ลบรถทะเบียน ${formatPlate(car)} แล้ว`);
      reload();
    } catch (error) {
      if (isApiErrorWithStatus(error, 404)) {
        void message.warning(CAR_NOT_FOUND_MESSAGE);
        reload();
        return;
      }
      void message.error(toThaiErrorMessage(error, DELETE_ERROR_MESSAGE));
    }
  }

  function emptyText(): string {
    if (isLoading) {
      return "กำลังโหลดข้อมูล";
    }
    if (errorMessage !== null) {
      return "ไม่สามารถแสดงข้อมูลได้";
    }
    return hasFilters ? "ไม่พบรถที่ตรงกับเงื่อนไข" : "ยังไม่มีข้อมูลรถ";
  }

  return (
    <Flex vertical gap="middle">
      <Flex justify="space-between" align="center" wrap gap="middle">
        <Typography.Title level={2} style={pageTitleStyle}>
          รายการรถยนต์
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          เพิ่มรถ
        </Button>
      </Flex>
      <Flex wrap gap="middle">
        <Input
          aria-label="ค้นหารถ"
          placeholder="ค้นหาทะเบียน จังหวัด ยี่ห้อ หรือรุ่น"
          prefix={<SearchOutlined />}
          allowClear
          value={searchText}
          onChange={handleSearchChange}
          style={searchInputStyle}
        />
        <Select
          aria-label="กรองตามสถานะ"
          options={statusFilterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          style={statusSelectStyle}
        />
      </Flex>
      {errorMessage !== null && (
        <Alert
          type="error"
          showIcon
          title={errorMessage}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={reload}>
              ลองใหม่
            </Button>
          }
        />
      )}
      <CarTable
        cars={cars}
        isLoading={isLoading}
        emptyText={emptyText()}
        onEdit={openFormModal}
        onDelete={handleDelete}
      />
      <CarFormModal
        key={formModal.sessionId}
        isOpen={formModal.isOpen}
        car={formModal.car}
        onCancel={closeFormModal}
        onSaved={handleSaved}
        onCarMissing={handleCarMissing}
      />
    </Flex>
  );
}
