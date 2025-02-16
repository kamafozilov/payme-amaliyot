export class BaseError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: string[] = [],
    public name: string = 'BaseError',
    public statusCode: number = status,
  ) {
    super(message);
    Object.setPrototypeOf(this, BaseError.prototype);
  }

  static BadRequest(message: string, errors: string[] = []): BaseError {
    return new BaseError(400, message, errors, 'BadRequest');
  }

  static Unauthorized(): BaseError {
    return new BaseError(401, 'Unauthorized', [], 'Unauthorized');
  }
}
