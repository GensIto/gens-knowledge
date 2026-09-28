export class AppError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 413 | 422 | 502 = 400,
  ) {
    super(message);
  }
}
