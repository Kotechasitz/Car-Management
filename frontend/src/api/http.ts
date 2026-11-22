export type FieldError = {
  path: string;
  message: string;
};

export type RequestOptions = {
  signal?: AbortSignal;
};

export const NETWORK_ERROR_STATUS = 0;

const NETWORK_ERROR_MESSAGE = "Network request failed";
const INVALID_RESPONSE_MESSAGE = "Unexpected response body";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: readonly FieldError[];

  constructor(status: number, message: string, fieldErrors: readonly FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type ErrorBody = {
  message: string;
  errors: FieldError[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFieldError(value: unknown): value is FieldError {
  return isRecord(value) && typeof value.path === "string" && typeof value.message === "string";
}

function parseErrorBody(value: unknown): ErrorBody | undefined {
  if (!isRecord(value) || typeof value.message !== "string" || value.message.trim() === "") {
    return undefined;
  }
  const errors = Array.isArray(value.errors) ? value.errors.filter(isFieldError) : [];
  return { message: value.message, errors };
}

function isAbortError(error: unknown, signal: AbortSignal | null | undefined): boolean {
  return signal?.aborted === true || (error instanceof DOMException && error.name === "AbortError");
}

async function readJsonBody(
  response: Response,
  signal: AbortSignal | null | undefined,
): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (isAbortError(error, signal)) {
      throw error;
    }
    return undefined;
  }
}

async function toApiError(
  response: Response,
  signal: AbortSignal | null | undefined,
): Promise<ApiError> {
  const body = parseErrorBody(await readJsonBody(response, signal));
  if (body === undefined) {
    return new ApiError(response.status, `HTTP ${response.status}`);
  }
  return new ApiError(response.status, body.message, body.errors);
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    if (isAbortError(error, init.signal)) {
      throw error;
    }
    throw new ApiError(NETWORK_ERROR_STATUS, NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    throw await toApiError(response, init.signal);
  }
  return response;
}

export async function requestJson<T>(
  path: string,
  isExpectedBody: (value: unknown) => value is T,
  init: RequestInit = {},
): Promise<T> {
  const response = await send(path, init);
  const body = await readJsonBody(response, init.signal);
  if (!isExpectedBody(body)) {
    throw new ApiError(response.status, INVALID_RESPONSE_MESSAGE);
  }
  return body;
}

export async function requestWithoutBody(path: string, init: RequestInit = {}): Promise<void> {
  await send(path, init);
}
