import type { CarStatus } from "../src/cars/car-status.js";
import { db } from "../src/db.js";
import type { Prisma } from "../src/generated/prisma/client.js";

type SeedCar = Omit<Prisma.CarCreateInput, "status"> & { status: CarStatus };

const seedCars: SeedCar[] = [
  {
    licensePlate: "1กข 1234",
    province: "กรุงเทพมหานคร",
    brand: "Toyota",
    model: "Camry",
    year: 2022,
    color: "ดำ",
    status: "AVAILABLE",
    mileage: 38500,
    note: "รถผู้บริหาร",
  },
  {
    licensePlate: "2กค 5678",
    province: "กรุงเทพมหานคร",
    brand: "Honda",
    model: "City",
    year: 2023,
    color: "ขาว",
    status: "IN_USE",
    mileage: 21400,
    note: null,
  },
  {
    licensePlate: "บข 4421",
    province: "ชลบุรี",
    brand: "Isuzu",
    model: "D-Max",
    year: 2020,
    color: "เทา",
    status: "MAINTENANCE",
    mileage: 112300,
    note: "เข้าศูนย์เปลี่ยนผ้าเบรก",
  },
  {
    licensePlate: "3กง 9012",
    province: "นนทบุรี",
    brand: "Mazda",
    model: "CX-5",
    year: 2021,
    color: "แดง",
    status: "AVAILABLE",
    mileage: 54800,
    note: null,
  },
  {
    licensePlate: "ฒฬ 7788",
    province: "เชียงใหม่",
    brand: "Nissan",
    model: "Navara",
    year: 2019,
    color: "น้ำเงิน",
    status: "INACTIVE",
    mileage: 186000,
    note: "รอจำหน่าย",
  },
  {
    licensePlate: "4กจ 3456",
    province: "กรุงเทพมหานคร",
    brand: "MG",
    model: "ZS EV",
    year: 2023,
    color: "ขาว",
    status: "IN_USE",
    mileage: 15200,
    note: null,
  },
  {
    licensePlate: "5กฉ 2468",
    province: "สมุทรปราการ",
    brand: "BYD",
    model: "Atto 3",
    year: 2024,
    color: "เทา",
    status: "AVAILABLE",
    mileage: 8900,
    note: null,
  },
  {
    licensePlate: "กท 1357",
    province: "ขอนแก่น",
    brand: "Toyota",
    model: "Hilux Revo",
    year: null,
    color: null,
    status: "AVAILABLE",
    mileage: null,
    note: null,
  },
];

try {
  await db.$transaction(
    seedCars.map((car) =>
      db.car.upsert({
        where: {
          licensePlate_province: { licensePlate: car.licensePlate, province: car.province },
        },
        update: car,
        create: car,
      }),
    ),
  );
  console.info(`Seeded ${seedCars.length} cars`);
} finally {
  await db.$disconnect();
}
