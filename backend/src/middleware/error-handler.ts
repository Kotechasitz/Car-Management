import { STATUS_CODES } from "node:http";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { z, ZodError } from "zod";
import { ConflictError, HttpError, NotFoundError, type FieldError } from "../errors/http-errors.js";
import { Prisma } from "../generated/prisma/client.js";

type ErrorResponseBody = {
  message: string;
  errors?: FieldError[];
};

const clientErrorStatusSchema = z.number().int().min(400).max(499);

const frameworkClientErrorSchema = z.object({
  status: clientErrorStatusSchema.optional(),
  statusCode: clientErrorStatusSchema.optional(),
  type: z.string().optional(),
});

const frameworkClientErrorMessages: Record<string, string> = {
  "entity.parse.failed": "Request body is not valid JSON",
  "entity.too.large": "Request body is too large",
};

function fromZodError(error: ZodError): HttpError {
  const errors = error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
  return new HttpError(400, "Validation failed", errors);
}

function fromPrismaError(error: Prisma.PrismaClientKnownRequestError): HttpError | undefined {
  switch (error.code) {
    case "P2002":
      return new ConflictError("Resource already exists");
    case "P2025":
      return new NotFoundError("Resource not found");
    default:
      return undefined;
  }
}

function fromFrameworkClientError(error: unknown): HttpError | undefined {
  const parsed = frameworkClientErrorSchema.safeParse(error);
  if (!parsed.success) {
    return undefined;
  }
  const status = parsed.data.status ?? parsed.data.statusCode;
  if (status === undefined) {
    return undefined;
  }
  const typeMessage =
    parsed.data.type === undefined ? undefined : frameworkClientErrorMessages[parsed.data.type];
  return new HttpError(status, typeMessage ?? STATUS_CODES[status] ?? "Bad request");
}

function toHttpError(error: unknown): HttpError | undefined {
  if (error instanceof HttpError) {
    return error;
  }
  if (error instanceof ZodError) {
    return fromZodError(error);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return fromPrismaError(error);
  }
  return fromFrameworkClientError(error);
}

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorResponseBody = { message: `Route ${req.method} ${req.path} not found` };
  res.status(404).json(body);
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const httpError = toHttpError(error);
  if (httpError === undefined) {
    console.error(error);
    const body: ErrorResponseBody = { message: "Internal server error" };
    res.status(500).json(body);
    return;
  }
  const body: ErrorResponseBody = { message: httpError.message, errors: httpError.errors };
  res.status(httpError.status).json(body);
};
