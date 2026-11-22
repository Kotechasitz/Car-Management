import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Empty, Flex, Grid, Popconfirm, Table, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import type { Car } from "../types/car";
import { EMPTY_VALUE_PLACEHOLDER, formatMileage, formatPlate } from "../utils/carFormat";
import { CarStatusTag } from "./CarStatusTag";

type CarTableProps = {
  cars: Car[];
  isLoading: boolean;
  emptyText: string;
  onEdit: (car: Car) => void;
  onDelete: (car: Car) => Promise<void>;
};

const tableScroll = { x: 1100 };

function buildColumns(
  onEdit: CarTableProps["onEdit"],
  onDelete: CarTableProps["onDelete"],
  shouldFixColumns: boolean,
): TableColumnsType<Car> {
  return [
    {
      title: "ทะเบียน",
      key: "licensePlate",
      width: 170,
      fixed: shouldFixColumns ? "left" : undefined,
      render: (_, car) => (
        <Flex vertical>
          <Typography.Text strong>{car.licensePlate}</Typography.Text>
          <Typography.Text type="secondary">{car.province}</Typography.Text>
        </Flex>
      ),
    },
    { title: "ยี่ห้อ", dataIndex: "brand", key: "brand", width: 130 },
    { title: "รุ่น", dataIndex: "model", key: "model", width: 130 },
    {
      title: "ปี",
      dataIndex: "year",
      key: "year",
      width: 80,
      render: (year: number | null) => year ?? EMPTY_VALUE_PLACEHOLDER,
    },
    {
      title: "สี",
      dataIndex: "color",
      key: "color",
      width: 100,
      render: (color: string | null) => color ?? EMPTY_VALUE_PLACEHOLDER,
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (_, car) => <CarStatusTag status={car.status} />,
    },
    {
      title: "เลขไมล์",
      dataIndex: "mileage",
      key: "mileage",
      width: 130,
      align: "right",
      render: (mileage: number | null) => formatMileage(mileage),
    },
    {
      title: "หมายเหตุ",
      dataIndex: "note",
      key: "note",
      ellipsis: { showTitle: false },
      render: (note: string | null) =>
        note === null ? (
          EMPTY_VALUE_PLACEHOLDER
        ) : (
          <Tooltip placement="topLeft" title={note}>
            {note}
          </Tooltip>
        ),
    },
    {
      title: "จัดการ",
      key: "actions",
      width: 170,
      fixed: shouldFixColumns ? "right" : undefined,
      render: (_, car) => (
        <Flex gap="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            aria-label={`แก้ไข ${formatPlate(car)}`}
            onClick={() => onEdit(car)}
          >
            แก้ไข
          </Button>
          <Popconfirm
            title={`ยืนยันการลบรถทะเบียน ${formatPlate(car)}?`}
            okText="ลบ"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(car)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={`ลบ ${formatPlate(car)}`}
            >
              ลบ
            </Button>
          </Popconfirm>
        </Flex>
      ),
    },
  ];
}

export function CarTable({ cars, isLoading, emptyText, onEdit, onDelete }: CarTableProps) {
  const screens = Grid.useBreakpoint();
  const shouldFixColumns = screens.md === true;

  return (
    <Table<Car>
      rowKey="id"
      columns={buildColumns(onEdit, onDelete, shouldFixColumns)}
      dataSource={cars}
      loading={isLoading}
      scroll={tableScroll}
      locale={{ emptyText: <Empty description={emptyText} /> }}
      pagination={{
        defaultPageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `ทั้งหมด ${total} คัน`,
      }}
    />
  );
}
