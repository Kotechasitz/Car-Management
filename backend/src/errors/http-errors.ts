export type FieldError = {
  path: string;
  message: string;
};

export class HttpError extends Error {
  readonly status: number;
  readonly errors: FieldError[] | undefined;

  constructor(status: number, message: string, errors?: FieldError[]) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.errors = errors;
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, errors?: FieldError[]) {
    super(409, message, errors);
  }
}
