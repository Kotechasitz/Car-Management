# HAUPCAR Car Registry

เว็บสำหรับเพิ่ม ดู แก้ไข และลบข้อมูลรถของบริษัท

Add, view, edit and delete company cars. React and Ant Design on the frontend, an Express REST API on the backend, Prisma with SQLite for storage.

## Features

- List all cars with search by plate, province, brand or model, and a status filter
- Add a car, edit it, or delete it after confirmation
- License plate is unique per province, enforced by the database
- Thai user interface with field-level error messages

## Tech stack

| Part     | Tools                                           |
| -------- | ----------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Ant Design 6        |
| Backend  | Node.js, Express 5, TypeScript, Zod             |
| Database | SQLite through Prisma 7                         |
| Testing  | Vitest, Supertest, React Testing Library        |
| Tooling  | oxlint, Prettier, npm scripts with concurrently |

## Prerequisites

- Node.js 22+

## Getting started

```bash
npm run setup
npm run dev
```

`setup` installs all dependencies, creates `backend/.env` from `backend/.env.example`, applies the database migration and seeds 8 sample cars. Running it again resets the sample cars.

`dev` starts both apps:

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

The frontend calls the API through the Vite proxy at `/api`.

## Scripts

| Command                | What it does                             |
| ---------------------- | ---------------------------------------- |
| `npm run setup`        | Install, create the database and seed it |
| `npm run dev`          | Start backend and frontend               |
| `npm test`             | Run backend and frontend tests           |
| `npm run lint`         | Lint both apps                           |
| `npm run format:check` | Check formatting                         |

## API

Base URL: `http://localhost:3001/api`

| Method | Path        | Description                                   | Success | Errors        |
| ------ | ----------- | --------------------------------------------- | ------- | ------------- |
| GET    | `/cars`     | List cars, optional `?search=` and `?status=` | 200     | 400           |
| GET    | `/cars/:id` | Get one car                                   | 200     | 400, 404      |
| POST   | `/cars`     | Create a car                                  | 201     | 400, 409      |
| PUT    | `/cars/:id` | Replace a car (send every field)              | 200     | 400, 404, 409 |
| DELETE | `/cars/:id` | Delete a car                                  | 204     | 400, 404      |

### Car

| Field          | Type           | Required | Notes                                                                               |
| -------------- | -------------- | -------- | ----------------------------------------------------------------------------------- |
| `licensePlate` | string         | yes      | Up to 20 characters, extra spaces are removed                                       |
| `province`     | string         | yes      | Up to 100 characters. Plate and province together must be unique                    |
| `brand`        | string         | yes      | Up to 50 characters                                                                 |
| `model`        | string         | yes      | Up to 50 characters                                                                 |
| `year`         | number or null | no       | 1950 to next year                                                                   |
| `color`        | string or null | no       | Up to 30 characters                                                                 |
| `status`       | string         | yes      | `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `INACTIVE`. Defaults to `AVAILABLE` on create |
| `mileage`      | number or null | no       | 0 or more                                                                           |
| `note`         | string or null | no       | Up to 500 characters                                                                |

Example:

```bash
curl -X POST http://localhost:3001/api/cars \
  -H "Content-Type: application/json" \
  -d '{"licensePlate":"1กข 1234","province":"กรุงเทพมหานคร","brand":"Toyota","model":"Camry","status":"AVAILABLE"}'
```

Errors share one shape:

```json
{
  "message": "Validation failed",
  "errors": [{ "path": "brand", "message": "Brand is required" }]
}
```

## Project structure

```
backend/
  prisma/              schema, migrations, seed
  src/
    app.ts             Express app and middleware
    server.ts          HTTP server
    config.ts          environment variables
    db.ts              Prisma client
    cars/              routes, schemas, service
    errors/            HTTP error types
    middleware/        error handler
  tests/               API tests against a separate test database
frontend/
  src/
    api/               HTTP client and car API
    pages/             car list page
    components/        table, form modal, status tag
    hooks/             list loading and debounced search
    utils/             formatting and Thai error messages
    types/             shared car types
```

## Testing

```bash
npm test
```

Backend tests run through HTTP with Supertest against `backend/test.db`, which is created fresh for each run, so the development database is never touched. Frontend tests render the page with React Testing Library against a fake API.

## Design decisions

- SQLite through Prisma, so the project runs right after cloning with no database server to install. Switching to PostgreSQL or MySQL only needs a different Prisma provider and connection string.
- Request bodies and query strings are validated with Zod at the route, so the service layer only receives clean, typed data.
- One error handler turns every error into the same JSON shape and the right status code.
- Duplicate plates are blocked by a unique index on plate and province in the database, not only by a check in code, so two requests at the same time cannot both succeed.
- `PUT` replaces the whole car, which keeps the update rules simple and matches the edit form.
- The seed uses upsert, so running setup again never creates duplicates.
