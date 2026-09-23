export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super(400, 'TIME_LOG_VALIDATION_FAILED', 'The time log is invalid.', errors);
  }
}

export class NotFoundError extends AppError {
  constructor() {
    super(404, 'TIME_LOG_NOT_FOUND', 'The time log was not found.');
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(403, 'TIME_LOG_FORBIDDEN', 'You can only change your own time logs.');
  }
}

export class ConflictError extends AppError {
  constructor() {
    super(
      409,
      'TIME_LOG_CONFLICT',
      'This time log changed since you loaded it. Refresh and try again.',
    );
  }
}
