export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public expose = true
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (message = "Not found") => new HttpError(message, 404);
export const badRequest = (message = "Bad request") => new HttpError(message, 400);
export const serverError = (message = "Unexpected error") => new HttpError(message, 500, false);
