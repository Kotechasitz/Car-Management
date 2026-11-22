import { Tag } from "antd";
import { CAR_STATUS_DISPLAY, type CarStatus } from "../types/car";

type CarStatusTagProps = {
  status: CarStatus;
};

export function CarStatusTag({ status }: CarStatusTagProps) {
  const display = CAR_STATUS_DISPLAY[status];
  return <Tag color={display.tagColor}>{display.label}</Tag>;
}
