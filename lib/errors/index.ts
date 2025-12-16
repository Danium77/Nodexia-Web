// lib/errors/index.ts
// Centralized error handling for the application

export interface AppError {
  code: string;
  message: string;
  details?: string;
  statusCode?: number;
}

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: string;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    details?: string
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    if (details) this.details = details;
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: string) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, details?: string) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required', details?: string) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Insufficient permissions', details?: string) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string = 'Resource', details?: string) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404, details);
    this.name = 'NotFoundError';
  }
}

// Error handler utility functions
export const handleSupabaseError = (error: any): ApplicationError => {
  if (!error) return new ApplicationError('Unknown error occurred');
  
  // Map common Supabase error codes
  switch (error.code) {
    case '23505': // unique_violation
      return new ValidationError('Duplicate entry found', error.message);
    case '23503': // foreign_key_violation
      return new ValidationError('Referenced record not found', error.message);
    case '42P01': // undefined_table
      return new DatabaseError('Table not found', error.message);
    case 'PGRST301': // JWT expired
      return new AuthenticationError('Session expired', error.message);
    case 'PGRST106': // Schema cache error
      return new DatabaseError('Database schema error', error.message);
    default:
      return new ApplicationError(
        error.message || 'Database operation failed',
        'SUPABASE_ERROR',
        500,
        error.details || error.hint
      );
  }
};

export const handleApiError = (error: any, defaultMessage: string = 'An error occurred'): AppError => {
  if (error instanceof ApplicationError) {
    const result: AppError = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode
    };
    if (error.details) result.details = error.details;
    return result;
  }

  if (error?.message) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      statusCode: 500
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: defaultMessage,
    statusCode: 500
  };
};

// Error logging utility
export const logError = (error: any, context?: string) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    }
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Application Error:', errorInfo);
  }

  // In production, you might want to send to error tracking service
  // e.g., Sentry, LogRocket, etc.
};