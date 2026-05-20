/**
 * MongoDB Database Schemas for CT/VT Adequacy Analysis Platform
 * Each feature has its own dedicated collection with proper indexing
 */

import { ObjectId } from 'mongodb';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE SYSTEM SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface User {
  _id: ObjectId;
  email: string;
  name: string;
  password: string; // hashed
  role: 'ENGINEER' | 'ADMIN' | 'MANAGER';
  organizationId: ObjectId;
  isActive: boolean;
  lastLogin?: Date;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    notifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  _id: ObjectId;
  name: string;
  domain: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  settings: {
    defaultStandard: 'IEC' | 'IEEE' | 'ANSI';
    defaultCurrency: string;
    workingHours: {
      start: string;
      end: string;
      timezone: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  _id: ObjectId;
  name: string;
  description: string;
  organizationId: ObjectId;
  ownerId: ObjectId;
  members: Array<{
    userId: ObjectId;
    role: 'VIEWER' | 'EDITOR' | 'ADMIN';
    joinedAt: Date;
  }>;
  settings: {
    isPublic: boolean;
    allowExternalSharing: boolean;
    defaultApprovalWorkflow: ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION & AUTHORIZATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface Session {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: Date;
}

export interface RefreshToken {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

export interface Permission {
  _id: ObjectId;
  name: string;
  resource: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
  description: string;
}

export interface UserRole {
  _id: ObjectId;
  userId: ObjectId;
  workspaceId: ObjectId;
  role: 'ENGINEER' | 'ADMIN' | 'MANAGER';
  permissions: ObjectId[];
  assignedBy: ObjectId;
  assignedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CT/VT ANALYSIS SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface Template {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  description: string;
  relay: string;
  iedType: string;
  functions: string[];
  parameters: {
    [key: string]: {
      type: 'number' | 'string' | 'boolean';
      default?: any;
      required: boolean;
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
      };
    };
  };
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Computation {
  _id: ObjectId;
  workspaceId: ObjectId;
  templateId: ObjectId;
  templateName: string;
  iedType: string;
  sheet1: {
    ct_ratio_primary: number;
    ct_ratio_secondary: number;
    accuracy_class: string;
    rct: number;
    vk_available: number;
    io_at_vk: number;
  };
  sheet2: {
    frequency: number;
    bus_voltage_kv: number;
    max_bus_fault_mva: number;
    r1: number;
    x1: number;
    r0: number;
    x0: number;
    route_length_km: number;
    relay_burden_va: number;
    lead_resistance: number;
  };
  result: {
    verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
    ealreq_max: number;
    vk_required: number;
    vk_available: number;
    vk_breakdown: Array<{
      label: string;
      ealreq: number;
      vk: number;
      isMax: boolean;
    }>;
    intermediates: Record<string, number | string>;
  };
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelayTemplate {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  manufacturer: string;
  model: string;
  type: 'DIFFERENTIAL' | 'DISTANCE' | 'BREAKER_FAILURE' | 'OVERCURRENT' | 'DIRECTIONAL';
  functions: {
    differential: boolean;
    distance: boolean;
    breakerFailure: boolean;
    overcurrent: boolean;
    directional: boolean;
  };
  specifications: {
    ratedVoltage: number;
    ratedCurrent: number;
    frequency: number;
    accuracy: string;
    burden: number;
  };
  datasheet?: {
    filename: string;
    url: string;
    uploadedAt: Date;
  };
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface VTCheck {
  _id: ObjectId;
  workspaceId: ObjectId;
  substationId: ObjectId;
  vtParameters: {
    ratio_primary: number;
    ratio_secondary: number;
    accuracy_class: string;
    burden_va: number;
    voltage_factor: number;
  };
  systemParameters: {
    system_voltage: number;
    frequency: number;
    earthing_type: 'SOLID' | 'RESISTANCE' | 'REACTANCE' | 'ISOLATED';
  };
  result: {
    verdict: 'ADEQUATE' | 'INADEQUATE';
    voltage_error: number;
    phase_error: number;
    thermal_rating: number;
  };
  createdBy: ObjectId;
  createdAt: Date;
}

export interface CTCheck {
  _id: ObjectId;
  workspaceId: ObjectId;
  substationId: ObjectId;
  ctParameters: {
    ratio_primary: number;
    ratio_secondary: number;
    accuracy_class: string;
    knee_point_voltage: number;
    secondary_resistance: number;
  };
  loadParameters: {
    burden_va: number;
    lead_resistance: number;
    fault_current: number;
  };
  result: {
    verdict: 'ADEQUATE' | 'INADEQUATE';
    saturation_factor: number;
    accuracy_limit_factor: number;
    composite_error: number;
  };
  createdBy: ObjectId;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFRASTRUCTURE & EQUIPMENT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface Substation {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  voltageLevel: number;
  type: 'TRANSMISSION' | 'DISTRIBUTION' | 'INDUSTRIAL';
  configuration: 'SINGLE_BUS' | 'DOUBLE_BUS' | 'RING' | 'BREAKER_HALF';
  bays: ObjectId[];
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bay {
  _id: ObjectId;
  substationId: ObjectId;
  name: string;
  type: 'FEEDER' | 'TRANSFORMER' | 'BUS_COUPLER' | 'BUS_SECTION';
  voltageLevel: number;
  equipment: ObjectId[];
  ieds: ObjectId[];
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IED {
  _id: ObjectId;
  bayId: ObjectId;
  name: string;
  manufacturer: string;
  model: string;
  type: 'PROTECTION' | 'CONTROL' | 'METERING' | 'MONITORING';
  functions: string[];
  ct: {
    ratio: string;
    class: string;
    rct: number;
    vk: number;
    io: number;
  };
  vt: {
    ratio: string;
    class: string;
    burden: number;
  };
  communication: {
    protocol: string;
    address: string;
    port: number;
  };
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Equipment {
  _id: ObjectId;
  bayId: ObjectId;
  name: string;
  type: 'TRANSFORMER' | 'BREAKER' | 'DISCONNECTOR' | 'CT' | 'VT' | 'SURGE_ARRESTER';
  manufacturer: string;
  model: string;
  specifications: Record<string, any>;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA IMPORT & PROCESSING SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImportJob {
  _id: ObjectId;
  workspaceId: ObjectId;
  type: 'EXCEL' | 'CSV' | 'XML' | 'JSON';
  filename: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  errors: Array<{
    row: number;
    column: string;
    message: string;
  }>;
  result: {
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  createdBy: ObjectId;
  createdAt: Date;
  completedAt?: Date;
}

export interface ExcelImport {
  _id: ObjectId;
  workspaceId: ObjectId;
  filename: string;
  originalData: Record<string, any>;
  parsedData: {
    ct: Record<string, any>;
    vt: Record<string, any>;
    system: Record<string, any>;
    ieds: Array<Record<string, any>>;
  };
  mapping: Record<string, string>;
  validationResults: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  createdBy: ObjectId;
  createdAt: Date;
}

export interface FileUpload {
  _id: ObjectId;
  workspaceId: ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  metadata: Record<string, any>;
  uploadedBy: ObjectId;
  uploadedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS & REPORTING SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnalysisResult {
  _id: ObjectId;
  workspaceId: ObjectId;
  type: 'CT_ADEQUACY' | 'VT_ADEQUACY' | 'FULL_ANALYSIS' | 'COMPARISON';
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  metadata: {
    calculationMethod: string;
    standard: string;
    version: string;
    executionTime: number;
  };
  createdBy: ObjectId;
  createdAt: Date;
}

export interface Report {
  _id: ObjectId;
  workspaceId: ObjectId;
  title: string;
  type: 'PDF' | 'EXCEL' | 'WORD' | 'HTML';
  template: string;
  data: Record<string, any>;
  generatedFile?: {
    filename: string;
    url: string;
    size: number;
  };
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  createdBy: ObjectId;
  createdAt: Date;
  generatedAt?: Date;
}

export interface Analytics {
  _id: ObjectId;
  workspaceId: ObjectId;
  metric: string;
  value: number;
  dimensions: Record<string, string>;
  timestamp: Date;
  period: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface Comparison {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  items: Array<{
    id: ObjectId;
    type: 'COMPUTATION' | 'ANALYSIS' | 'TEMPLATE';
    data: Record<string, any>;
  }>;
  result: {
    differences: Array<{
      field: string;
      values: any[];
      significance: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
    summary: string;
  };
  createdBy: ObjectId;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW & APPROVAL SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface Approval {
  _id: ObjectId;
  workspaceId: ObjectId;
  resourceType: 'COMPUTATION' | 'ANALYSIS' | 'REPORT' | 'TEMPLATE';
  resourceId: ObjectId;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approver: ObjectId;
  requester: ObjectId;
  comments: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workflow {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  description: string;
  steps: Array<{
    id: string;
    name: string;
    type: 'APPROVAL' | 'NOTIFICATION' | 'CALCULATION' | 'VALIDATION';
    assignee: ObjectId;
    conditions: Record<string, any>;
    actions: Record<string, any>;
  }>;
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalChain {
  _id: ObjectId;
  workflowId: ObjectId;
  resourceId: ObjectId;
  currentStep: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  steps: Array<{
    stepId: string;
    assignee: ObjectId;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
    completedAt?: Date;
    comments?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY & AUDIT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditLog {
  _id: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface ActivityLog {
  _id: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  type: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT';
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface UserActivity {
  _id: ObjectId;
  userId: ObjectId;
  workspaceId: ObjectId;
  sessionId: ObjectId;
  page: string;
  action: string;
  duration: number;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS & CONFIGURATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface Settings {
  _id: ObjectId;
  workspaceId: ObjectId;
  category: 'GENERAL' | 'CALCULATION' | 'REPORTING' | 'INTEGRATION';
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  isEditable: boolean;
  updatedBy: ObjectId;
  updatedAt: Date;
}

export interface Configuration {
  _id: ObjectId;
  name: string;
  version: string;
  data: Record<string, any>;
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
}

export interface UserPreference {
  _id: ObjectId;
  userId: ObjectId;
  workspaceId: ObjectId;
  preferences: {
    dashboard: {
      layout: string;
      widgets: Array<{
        id: string;
        position: { x: number; y: number; w: number; h: number };
        config: Record<string, any>;
      }>;
    };
    notifications: {
      email: boolean;
      browser: boolean;
      types: string[];
    };
    display: {
      theme: 'light' | 'dark' | 'system';
      language: string;
      timezone: string;
      dateFormat: string;
      numberFormat: string;
    };
  };
  updatedAt: Date;
}

export interface Notification {
  _id: ObjectId;
  userId: ObjectId;
  workspaceId: ObjectId;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE INDEXES CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const DATABASE_INDEXES = {
  users: [
    { email: 1 },
    { organizationId: 1 },
    { 'email': 1, 'organizationId': 1 }
  ],
  workspaces: [
    { organizationId: 1 },
    { ownerId: 1 },
    { 'members.userId': 1 }
  ],
  computations: [
    { workspaceId: 1 },
    { templateId: 1 },
    { createdBy: 1 },
    { createdAt: -1 },
    { approvalStatus: 1 }
  ],
  templates: [
    { workspaceId: 1 },
    { iedType: 1 },
    { createdBy: 1 }
  ],
  substations: [
    { workspaceId: 1 },
    { name: 1 },
    { type: 1 }
  ],
  audit_logs: [
    { workspaceId: 1 },
    { userId: 1 },
    { createdAt: -1 },
    { action: 1 },
    { resourceType: 1 }
  ],
  activity_logs: [
    { workspaceId: 1 },
    { userId: 1 },
    { timestamp: -1 },
    { type: 1 }
  ],
  approvals: [
    { workspaceId: 1 },
    { resourceId: 1 },
    { status: 1 },
    { approver: 1 },
    { createdAt: -1 }
  ]
};