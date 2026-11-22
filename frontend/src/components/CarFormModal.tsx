import { App, Col, Form, Input, InputNumber, Modal, Row, Select } from "antd";
import { useState } from "react";
import { createCar, updateCar } from "../api/cars";
import { ApiError } from "../api/http";
import { THAI_PROVINCES } from "../data/thaiProvinces";
import { CAR_STATUSES, CAR_STATUS_DISPLAY, type Car, type CarInput } from "../types/car";
import {
  CAR_NOT_FOUND_MESSAGE,
  isApiErrorWithStatus,
  toThaiErrorMessage,
} from "../utils/errorMessages";
import {
  CAR_FIELD_LIMITS,
  MAX_MILEAGE,
  OLDEST_CAR_YEAR,
  latestAllowedCarYear,
  toCarFieldErrors,
  toCarFormValues,
  toCarInput,
  type CarFormValues,
} from "./carForm";

type CarFormModalProps = {
  isOpen: boolean;
  car: Car | null;
  onCancel: () => void;
  onSaved: (car: Pick<CarInput, "licensePlate" | "province">, isNew: boolean) => void;
  onCarMissing: () => void;
};

const SAVE_ERROR_MESSAGE = "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

const provinceOptions = THAI_PROVINCES.map((province) => ({ value: province, label: province }));
const statusOptions = CAR_STATUSES.map((status) => ({
  value: status,
  label: CAR_STATUS_DISPLAY[status].label,
}));
const provinceSearch = { optionFilterProp: "label" };
const fullWidthStyle = { width: "100%" };

function isSavedWithUnreadableBody(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 200 && error.status < 300;
}

function formatThousands(value: number | string | undefined): string {
  return value === undefined ? "" : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function removeThousandSeparators(value: string | undefined): string {
  return (value ?? "").replace(/,/g, "");
}

export function CarFormModal({ isOpen, car, onCancel, onSaved, onCarMissing }: CarFormModalProps) {
  const [form] = Form.useForm<CarFormValues>();
  const { message } = App.useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = car !== null;
  const latestYear = latestAllowedCarYear();

  async function handleFinish(values: CarFormValues): Promise<void> {
    const input = toCarInput(values);
    setIsSubmitting(true);
    try {
      const savedCar = car === null ? await createCar(input) : await updateCar(car.id, input);
      onSaved(savedCar, car === null);
    } catch (error) {
      if (isSavedWithUnreadableBody(error)) {
        onSaved(input, car === null);
        return;
      }
      if (isEditing && isApiErrorWithStatus(error, 404)) {
        void message.error(CAR_NOT_FOUND_MESSAGE);
        onCarMissing();
        return;
      }
      const fieldErrors = error instanceof ApiError ? toCarFieldErrors(error) : [];
      if (fieldErrors.length > 0) {
        form.setFields(fieldErrors);
        return;
      }
      void message.error(toThaiErrorMessage(error, SAVE_ERROR_MESSAGE));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={isOpen}
      title={isEditing ? "แก้ไขข้อมูลรถ" : "เพิ่มรถ"}
      okText="บันทึก"
      cancelText="ยกเลิก"
      okButtonProps={{ loading: isSubmitting }}
      onOk={form.submit}
      cancelButtonProps={{ disabled: isSubmitting }}
      closable={!isSubmitting}
      keyboard={!isSubmitting}
      mask={{ closable: false }}
      onCancel={onCancel}
      destroyOnHidden
      width={720}
    >
      <Form<CarFormValues>
        form={form}
        layout="vertical"
        initialValues={toCarFormValues(car)}
        onFinish={handleFinish}
        disabled={isSubmitting}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="licensePlate"
              label="ทะเบียนรถ"
              rules={[
                { required: true, whitespace: true, message: "กรุณากรอกทะเบียนรถ" },
                {
                  max: CAR_FIELD_LIMITS.licensePlate,
                  message: `ทะเบียนรถต้องไม่เกิน ${CAR_FIELD_LIMITS.licensePlate} ตัวอักษร`,
                },
              ]}
            >
              <Input placeholder="เช่น กข 1234" maxLength={CAR_FIELD_LIMITS.licensePlate} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="province"
              label="จังหวัด"
              rules={[
                { required: true, whitespace: true, message: "กรุณาเลือกจังหวัด" },
                {
                  max: CAR_FIELD_LIMITS.province,
                  message: `จังหวัดต้องไม่เกิน ${CAR_FIELD_LIMITS.province} ตัวอักษร`,
                },
              ]}
            >
              <Select
                options={provinceOptions}
                showSearch={provinceSearch}
                placeholder="เลือกจังหวัด"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="brand"
              label="ยี่ห้อ"
              rules={[
                { required: true, whitespace: true, message: "กรุณากรอกยี่ห้อ" },
                {
                  max: CAR_FIELD_LIMITS.brand,
                  message: `ยี่ห้อต้องไม่เกิน ${CAR_FIELD_LIMITS.brand} ตัวอักษร`,
                },
              ]}
            >
              <Input placeholder="เช่น Toyota" maxLength={CAR_FIELD_LIMITS.brand} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="model"
              label="รุ่น"
              rules={[
                { required: true, whitespace: true, message: "กรุณากรอกรุ่น" },
                {
                  max: CAR_FIELD_LIMITS.model,
                  message: `รุ่นต้องไม่เกิน ${CAR_FIELD_LIMITS.model} ตัวอักษร`,
                },
              ]}
            >
              <Input placeholder="เช่น Yaris" maxLength={CAR_FIELD_LIMITS.model} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="year"
              label="ปี (ค.ศ.)"
              rules={[
                {
                  type: "integer",
                  min: OLDEST_CAR_YEAR,
                  max: latestYear,
                  message: `ปีต้องอยู่ระหว่าง ${OLDEST_CAR_YEAR} ถึง ${latestYear}`,
                },
              ]}
            >
              <InputNumber
                min={OLDEST_CAR_YEAR}
                max={latestYear}
                precision={0}
                placeholder="เช่น 2022"
                style={fullWidthStyle}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="color"
              label="สี"
              rules={[
                {
                  max: CAR_FIELD_LIMITS.color,
                  message: `สีต้องไม่เกิน ${CAR_FIELD_LIMITS.color} ตัวอักษร`,
                },
              ]}
            >
              <Input placeholder="เช่น ขาว" maxLength={CAR_FIELD_LIMITS.color} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="status"
              label="สถานะ"
              rules={[{ required: true, message: "กรุณาเลือกสถานะ" }]}
            >
              <Select options={statusOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="mileage"
              label="เลขไมล์ (กม.)"
              rules={[
                {
                  type: "integer",
                  min: 0,
                  max: MAX_MILEAGE,
                  message: "เลขไมล์ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป",
                },
              ]}
            >
              <InputNumber
                min={0}
                max={MAX_MILEAGE}
                precision={0}
                formatter={formatThousands}
                parser={removeThousandSeparators}
                placeholder="เช่น 50,000"
                style={fullWidthStyle}
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              name="note"
              label="หมายเหตุ"
              rules={[
                {
                  max: CAR_FIELD_LIMITS.note,
                  message: `หมายเหตุต้องไม่เกิน ${CAR_FIELD_LIMITS.note} ตัวอักษร`,
                },
              ]}
            >
              <Input.TextArea rows={3} maxLength={CAR_FIELD_LIMITS.note} showCount />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
