// Advanced Error Handling and Logging System
import { NextResponse } from 'next/server';

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_CT_PARAMETERS = 'INVALID_CT_PARAMETERS',
  INVALID_SYSTEM_PARAMETERS = 'INVALID_SYSTEM_PARAMETERS',
  
  // Calculation Errors
  CALCULATION_FAILED = 'CALCULATION_FAILED',
  DIVISION_BY_ZERO = 'DIVISION_BY_ZERO',
  INVALID_FORMULA = 'INVALID_FORMULA',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  
  // Database Errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  
  // File Processing Errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_FORMAT = 'UNSUPPORTED_FILE_FORMAT',
  EXCEL_PARSING_FAILED = 'EXCEL_PARSING_FAILED',
  
  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  field?: string;
  value?: any;
  context?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  userId?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly field?: string;
  public readonly value?: any;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly userId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    field?: string,
    value?: any,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
    this.value = value;
    this.context = context;
    this.timestamp = new Date();
    
    // Capture stack trace
    Error.captureStackTrace(this, AppError);
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      field: this.field,
      value: this.value,
      context: this.context,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: any) {
    super(ErrorCode.INVALID_INPUT, message, 400, field, value);
  }
}

export class CalculationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.CALCULATION_FAILED, message, 422, undefined, undefined, context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.DATABASE_CONNECTION_FAILED, message, 500, undefined, undefined, context);
  }
}

export class Logger {
  private static instance: Logger;
  private logs: Array<{
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    context?: Record<string, any>;
    timestamp: Date;
    userId?: string;
    requestId?: string;
  }> = [];

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, context?: Record<string, any>, userId?: string, requestId?: string) {
    this.log('info', message, context, userId, requestId);
  }

  warn(message: string, context?: Record<string, any>, userId?: string, requestId?: string) {
    this.log('warn', message, context, userId, requestId);
  }

  error(message: string, context?: Record<string, any>, userId?: string, requestId?: string) {
    this.log('error', message, context, userId, requestId);
  }

  debug(message: string, context?: Record<string, any>, userId?: string, requestId?: string) {
    this.log('debug', message, context, userId, requestId);
  }

  private log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    context?: Record<string, any>,
    userId?: string,
    requestId?: string
  ) {
    const logEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      userId,
      requestId
    };

    this.logs.push(logEntry);
    
    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      console[level === 'debug' ? 'log' : level](
        `[${logEntry.timestamp.toISOString()}] ${level.toUpperCase()}: ${message}`,
        context ? JSON.stringify(context, null, 2) : ''
      );
    }

    // In production, you would send to external logging service
    // e.g., Winston, Datadog, CloudWatch, etc.
  }

  getLogs(level?: string, limit: number = 100) {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    return filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export class ErrorHandler {
  private static logger = Logger.getInstance();

  static handleError(error: unknown, userId?: string, requestId?: string): NextResponse {
    if (error instanceof AppError) {
      this.logger.error(error.message, {
        code: error.code,
        field: error.field,
        value: error.value,
        context: error.context,
        stack: error.stack
      }, userId, requestId);

      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            field: error.field,
            timestamp: error.timestamp
          }
        },
        { status: error.statusCode }
      );
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      this.logger.error(`Unhandled error: ${error.message}`, {
        stack: error.stack,
        name: error.name
      }, userId, requestId);

      return NextResponse.json(
        {
          error: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            timestamp: new Date()
          }
        },
        { status: 500 }
      );
    }

    // Handle unknown errors
    this.logger.error('Unknown error occurred', { error }, userId, requestId);
    
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date()
        }
      },
      { status: 500 }
    );
  }

  static validateCTParameters(sheet1: any): void {
    if (!sheet1.ct_ratio_primary || sheet1.ct_ratio_primary <= 0) {
      throw new ValidationError('CT primary ratio must be greater than 0', 'ct_ratio_primary', sheet1.ct_ratio_primary);
    }

    if (!sheet1.ct_ratio_secondary || sheet1.ct_ratio_secondary <= 0) {
      throw new ValidationError('CT secondary ratio must be greater than 0', 'ct_ratio_secondary', sheet1.ct_ratio_secondary);
    }

    if (!sheet1.accuracy_class || typeof sheet1.accuracy_class !== 'string') {
      throw new ValidationError('CT accuracy class is required', 'accuracy_class', sheet1.accuracy_class);
    }

    if (sheet1.rct < 0) {
      throw new ValidationError('CT resistance cannot be negative', 'rct', sheet1.rct);
    }

    if (!sheet1.vk_available || sheet1.vk_available <= 0) {
      throw new ValidationError('Knee point voltage must be greater than 0', 'vk_available', sheet1.vk_available);
    }

    if (sheet1.io_at_vk < 0) {
      throw new ValidationError('Magnetizing current cannot be negative', 'io_at_vk', sheet1.io_at_vk);
    }
  }

  static validateSystemParameters(sheet2: any): void {
    if (!sheet2.frequency || sheet2.frequency <= 0) {
      throw new ValidationError('Frequency must be greater than 0', 'frequency', sheet2.frequency);
    }

    if (!sheet2.bus_voltage_kv || sheet2.bus_voltage_kv <= 0) {
      throw new ValidationError('Bus voltage must be greater than 0', 'bus_voltage_kv', sheet2.bus_voltage_kv);
    }

    if (!sheet2.max_bus_fault_mva || sheet2.max_bus_fault_mva <= 0) {
      throw new ValidationError('Maximum fault level must be greater than 0', 'max_bus_fault_mva', sheet2.max_bus_fault_mva);
    }

    if (sheet2.route_length_km < 0) {
      throw new ValidationError('Route length cannot be negative', 'route_length_km', sheet2.route_length_km);
    }

    if (sheet2.relay_burden_va < 0) {
      throw new ValidationError('Relay burden cannot be negative', 'relay_burden_va', sheet2.relay_burden_va);
    }

    if (sheet2.lead_resistance < 0) {
      throw new ValidationError('Lead resistance cannot be negative', 'lead_resistance', sheet2.lead_resistance);
    }
  }

  static validateCalculationInputs(iedType: string, sheet1: any, sheet2: any): void {
    if (!iedType || typeof iedType !== 'string') {
      throw new ValidationError('IED type is required', 'iedType', iedType);
    }

    this.validateCTParameters(sheet1);
    this.validateSystemParameters(sheet2);

    // Additional cross-validation
    const ctRatio = sheet1.ct_ratio_primary / sheet1.ct_ratio_secondary;
    if (ctRatio > 10000) {
      throw new ValidationError('CT ratio appears unusually high, please verify', 'ct_ratio', ctRatio);
    }

    const burden = sheet2.relay_burden_va / (sheet1.ct_ratio_secondary ** 2);
    if (burden > 100) {
      throw new ValidationError('Calculated burden appears unusually high, please verify inputs', 'burden', burden);
    }
  }
}

// Middleware for request ID generation
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Rate limiting helper
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();

  static checkLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier);

    if (!userRequests || now > userRequests.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (userRequests.count >= maxRequests) {
      return false;
    }

    userRequests.count++;
    return true;
  }
}