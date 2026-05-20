// Advanced Security and Compliance Framework
import crypto from 'crypto';
import { NextRequest } from 'next/server';

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
  audit: {
    retentionDays: number;
    sensitiveFields: string[];
  };
  compliance: {
    standards: ('ISO27001' | 'SOC2' | 'GDPR' | 'HIPAA')[];
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  };
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceFlags: string[];
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  retention: number; // days
  encryption: boolean;
  accessControl: string[];
  auditRequired: boolean;
}

export class SecurityService {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
  private static readonly SENSITIVE_FIELDS = [
    'password', 'passwordHash', 'token', 'secret', 'key', 'ssn', 'creditCard'
  ];

  // Data encryption/decryption
  static encrypt(data: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.ENCRYPTION_KEY);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encrypted, iv: iv.toString('hex') };
  }

  static decrypt(encrypted: string, iv: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.ENCRYPTION_KEY);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Data sanitization
  static sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    
    Object.keys(sanitized).forEach(key => {
      if (this.SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  // Input validation and sanitization
  static validateInput(input: any, schema: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // SQL injection prevention
    if (typeof input === 'string') {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
        /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(<)|(>)|(\{)|(\}))/
      ];
      
      if (sqlPatterns.some(pattern => pattern.test(input))) {
        errors.push('Input contains potentially malicious content');
      }
    }

    // XSS prevention
    if (typeof input === 'string') {
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];
      
      if (xssPatterns.some(pattern => pattern.test(input))) {
        errors.push('Input contains potentially malicious scripts');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // Rate limiting with IP tracking
  static checkRateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60000,
    ipAddress?: string
  ): { allowed: boolean; remaining: number; resetTime: number } {
    // Implementation would use Redis or similar for distributed rate limiting
    // This is a simplified in-memory version
    
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    
    // In production, use Redis with sliding window
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }
}

export class AuditService {
  private static events: AuditEvent[] = [];

  static async logEvent(
    userId: string,
    userEmail: string,
    action: string,
    resourceType: string,
    resourceId: string,
    request: NextRequest,
    success: boolean = true,
    details: Record<string, any> = {},
    riskLevel: AuditEvent['riskLevel'] = 'low'
  ): Promise<void> {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId,
      userEmail,
      action,
      resourceType,
      resourceId,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      success,
      details: SecurityService.sanitizeData(details),
      riskLevel,
      complianceFlags: this.generateComplianceFlags(action, resourceType, details)
    };

    this.events.push(event);

    // In production, store in database and send to SIEM
    await this.persistEvent(event);
    
    if (riskLevel === 'high' || riskLevel === 'critical') {
      await this.alertSecurityTeam(event);
    }
  }

  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }

  private static generateComplianceFlags(
    action: string,
    resourceType: string,
    details: Record<string, any>
  ): string[] {
    const flags: string[] = [];

    // GDPR compliance flags
    if (action.includes('DELETE') && resourceType === 'User') {
      flags.push('GDPR_RIGHT_TO_ERASURE');
    }
    
    if (action.includes('EXPORT') && resourceType === 'PersonalData') {
      flags.push('GDPR_DATA_PORTABILITY');
    }

    // SOC2 compliance flags
    if (action.includes('ACCESS') && details.sensitiveData) {
      flags.push('SOC2_ACCESS_CONTROL');
    }

    // ISO27001 flags
    if (action.includes('MODIFY') && resourceType === 'SecurityConfig') {
      flags.push('ISO27001_SECURITY_CHANGE');
    }

    return flags;
  }

  private static async persistEvent(event: AuditEvent): Promise<void> {
    // In production, store in secure audit database
    // Consider using append-only storage for immutability
    console.log('Audit event:', event);
  }

  private static async alertSecurityTeam(event: AuditEvent): Promise<void> {
    // Send alert to security team for high-risk events
    console.warn('High-risk security event:', event);
  }

  static getEvents(
    filters: {
      userId?: string;
      action?: string;
      resourceType?: string;
      riskLevel?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    limit: number = 100
  ): AuditEvent[] {
    let filtered = this.events;

    if (filters.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId);
    }
    
    if (filters.action) {
      filtered = filtered.filter(e => e.action.includes(filters.action));
    }
    
    if (filters.resourceType) {
      filtered = filtered.filter(e => e.resourceType === filters.resourceType);
    }
    
    if (filters.riskLevel) {
      filtered = filtered.filter(e => e.riskLevel === filters.riskLevel);
    }
    
    if (filters.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
    }

    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export class ComplianceService {
  private static readonly DATA_CLASSIFICATIONS: Record<string, DataClassification> = {
    'ct_parameters': {
      level: 'confidential',
      retention: 2555, // 7 years
      encryption: true,
      accessControl: ['ENGINEER', 'ADMIN'],
      auditRequired: true
    },
    'user_data': {
      level: 'restricted',
      retention: 2555,
      encryption: true,
      accessControl: ['ADMIN', 'MANAGER'],
      auditRequired: true
    },
    'computation_results': {
      level: 'internal',
      retention: 1825, // 5 years
      encryption: false,
      accessControl: ['ENGINEER', 'ADMIN', 'MANAGER'],
      auditRequired: true
    },
    'system_logs': {
      level: 'internal',
      retention: 365, // 1 year
      encryption: false,
      accessControl: ['ADMIN'],
      auditRequired: false
    }
  };

  static getDataClassification(dataType: string): DataClassification | null {
    return this.DATA_CLASSIFICATIONS[dataType] || null;
  }

  static checkDataAccess(
    dataType: string,
    userRole: string,
    action: 'read' | 'write' | 'delete'
  ): { allowed: boolean; reason?: string } {
    const classification = this.getDataClassification(dataType);
    
    if (!classification) {
      return { allowed: false, reason: 'Unknown data type' };
    }

    if (!classification.accessControl.includes(userRole)) {
      return { allowed: false, reason: 'Insufficient permissions' };
    }

    // Additional checks for sensitive operations
    if (action === 'delete' && classification.level === 'restricted') {
      return { allowed: false, reason: 'Deletion of restricted data requires special approval' };
    }

    return { allowed: true };
  }

  static generateComplianceReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): {
    summary: Record<string, number>;
    violations: any[];
    recommendations: string[];
  } {
    const auditEvents = AuditService.getEvents({
      startDate,
      endDate
    });

    const summary = {
      totalEvents: auditEvents.length,
      highRiskEvents: auditEvents.filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical').length,
      dataAccesses: auditEvents.filter(e => e.action.includes('ACCESS')).length,
      dataModifications: auditEvents.filter(e => e.action.includes('MODIFY')).length,
      failedAttempts: auditEvents.filter(e => !e.success).length
    };

    const violations: any[] = [];
    const recommendations: string[] = [];

    // Check for compliance violations
    auditEvents.forEach(event => {
      if (event.riskLevel === 'critical') {
        violations.push({
          type: 'Critical Security Event',
          event: event.action,
          timestamp: event.timestamp,
          details: event.details
        });
      }
    });

    // Generate recommendations
    if (summary.failedAttempts > 10) {
      recommendations.push('Consider implementing stronger authentication measures');
    }
    
    if (summary.highRiskEvents > 5) {
      recommendations.push('Review and strengthen access controls');
    }

    return { summary, violations, recommendations };
  }
}

// Middleware for security headers
export function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}

// Session management with enhanced security
export class SessionManager {
  private static sessions = new Map<string, {
    userId: string;
    createdAt: Date;
    lastActivity: Date;
    ipAddress: string;
    userAgent: string;
    isActive: boolean;
  }>();

  static createSession(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): string {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    
    this.sessions.set(sessionId, {
      userId,
      createdAt: now,
      lastActivity: now,
      ipAddress,
      userAgent,
      isActive: true
    });

    return sessionId;
  }

  static validateSession(
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): { valid: boolean; userId?: string; reason?: string } {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (!session.isActive) {
      return { valid: false, reason: 'Session inactive' };
    }

    // Check for session hijacking
    if (session.ipAddress !== ipAddress) {
      return { valid: false, reason: 'IP address mismatch' };
    }

    if (session.userAgent !== userAgent) {
      return { valid: false, reason: 'User agent mismatch' };
    }

    // Check session timeout (24 hours)
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - session.lastActivity.getTime() > maxAge) {
      return { valid: false, reason: 'Session expired' };
    }

    // Update last activity
    session.lastActivity = new Date();
    
    return { valid: true, userId: session.userId };
  }

  static invalidateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
    }
  }

  static invalidateAllUserSessions(userId: string): void {
    this.sessions.forEach(session => {
      if (session.userId === userId) {
        session.isActive = false;
      }
    });
  }
}