/**
 * MULTI-PROJECT MANAGEMENT SYSTEM
 * Handles project creation, storage, and management as specified in your requirements
 */

import type { CTVTAdequacyInput, CTVTAdequacyReport } from '@/lib/types/ct-vt-adequacy-types';

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT DATA MODEL (Your Step 13 Specification)
// ═══════════════════════════════════════════════════════════════════════════════

export interface Project {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  status: 'draft' | 'calculating' | 'completed' | 'archived';
  
  // Project Information
  project_info: {
    name: string;
    substation: string;
    bay?: string;
    voltage_level: string;
    description?: string;
    client?: string;
  };
  
  // Complete input data (Your Step 13 structure)
  data: {
    general_inputs: {
      bus_fault_level: number;
      voltage_level: number;
      frequency: number;
      xr_ratio: number;
    };
    
    line_parameters: {
      positive_sequence_resistance: number;
      positive_sequence_reactance: number;
      zero_sequence_resistance: number;
      zero_sequence_reactance: number;
      route_length: number;
    };
    
    ct_cable: {
      cross_section: number;
      resistance: number;
      lead_length: number;
    };
    
    vt_cable: {
      cross_section: number;
      resistance: number;
      lead_length: number;
    };
    
    ied_list: {
      ied_name: string;
      standard_parameters: Record<string, any>;
      calculated_parameters?: Record<string, any>;
      ct_result?: string;
      vt_result?: string;
      final_decision?: string;
    }[];
  };
  
  // Analysis results
  results?: CTVTAdequacyReport;
  
  // Metadata
  metadata: {
    calculation_version: string;
    standards_used: string[];
    audit_trail: AuditEntry[];
  };
}

export interface AuditEntry {
  timestamp: string;
  user: string;
  action: 'created' | 'modified' | 'calculated' | 'exported' | 'archived';
  details: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ProjectManager {
  
  /**
   * Create new project (Your enhancement #7)
   */
  static createProject(
    projectInfo: Project['project_info'], 
    createdBy: string
  ): Project {
    const projectId = this.generateProjectId();
    const now = new Date().toISOString();
    
    return {
      id: projectId,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
      status: 'draft',
      project_info: projectInfo,
      data: {
        general_inputs: {
          bus_fault_level: 31.5,
          voltage_level: 132,
          frequency: 50,
          xr_ratio: 15
        },
        line_parameters: {
          positive_sequence_resistance: 0.0271,
          positive_sequence_reactance: 0.1600,
          zero_sequence_resistance: 0.1300,
          zero_sequence_reactance: 0.0600,
          route_length: 1.74
        },
        ct_cable: {
          cross_section: 6,
          resistance: 3.08,
          lead_length: 120
        },
        vt_cable: {
          cross_section: 2.5,
          resistance: 7.41,
          lead_length: 120
        },
        ied_list: []
      },
      metadata: {
        calculation_version: '1.0.0',
        standards_used: ['IEC 61869-2', 'IEEE C37.110'],
        audit_trail: [{
          timestamp: now,
          user: createdBy,
          action: 'created',
          details: `Project "${projectInfo.name}" created`
        }]
      }
    };
  }

  /**
   * Duplicate existing project (Your enhancement #7)
   */
  static duplicateProject(
    sourceProject: Project, 
    newName: string, 
    createdBy: string
  ): Project {
    const duplicatedProject = {
      ...sourceProject,
      id: this.generateProjectId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: createdBy,
      status: 'draft' as const,
      project_info: {
        ...sourceProject.project_info,
        name: newName
      },
      results: undefined // Remove results from duplicate
    };

    // Add audit entry
    duplicatedProject.metadata.audit_trail = [{
      timestamp: new Date().toISOString(),
      user: createdBy,
      action: 'created',
      details: `Project duplicated from "${sourceProject.project_info.name}"`
    }];

    return duplicatedProject;
  }

  /**
   * Update project data
   */
  static updateProject(
    project: Project, 
    updates: Partial<Project>, 
    user: string
  ): Project {
    const updatedProject = {
      ...project,
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Add audit entry
    updatedProject.metadata.audit_trail.push({
      timestamp: new Date().toISOString(),
      user,
      action: 'modified',
      details: 'Project data updated'
    });

    return updatedProject;
  }

  /**
   * Save calculation results to project
   */
  static saveResults(
    project: Project, 
    results: CTVTAdequacyReport, 
    user: string
  ): Project {
    const updatedProject = {
      ...project,
      results,
      status: 'completed' as const,
      updated_at: new Date().toISOString()
    };

    // Add audit entry
    updatedProject.metadata.audit_trail.push({
      timestamp: new Date().toISOString(),
      user,
      action: 'calculated',
      details: `Analysis completed - ${results.overall_summary.overall_verdict}`
    });

    return updatedProject;
  }

  /**
   * Archive project
   */
  static archiveProject(project: Project, user: string): Project {
    const archivedProject = {
      ...project,
      status: 'archived' as const,
      updated_at: new Date().toISOString()
    };

    // Add audit entry
    archivedProject.metadata.audit_trail.push({
      timestamp: new Date().toISOString(),
      user,
      action: 'archived',
      details: 'Project archived'
    });

    return archivedProject;
  }

  /**
   * Convert project data to calculation input format
   */
  static toCalculationInput(project: Project): CTVTAdequacyInput {
    return {
      system: {
        bus_fault_level: project.data.general_inputs.bus_fault_level,
        system_frequency: project.data.general_inputs.frequency,
        bus_voltage_level: project.data.general_inputs.voltage_level,
        xr_ratio: project.data.general_inputs.xr_ratio
      },
      ct_wiring: {
        conductor_cross_section: project.data.ct_cable.cross_section,
        resistance_w_km_20c: project.data.ct_cable.resistance,
        lead_length_ct_to_relay: project.data.ct_cable.lead_length
      },
      vt_wiring: {
        conductor_cross_section: project.data.vt_cable.cross_section,
        resistance_w_km_20c: project.data.vt_cable.resistance,
        lead_length_vt_to_relay: project.data.vt_cable.lead_length
      },
      transmission_line: {
        positive_sequence_resistance: project.data.line_parameters.positive_sequence_resistance,
        positive_sequence_reactance: project.data.line_parameters.positive_sequence_reactance,
        zero_sequence_resistance: project.data.line_parameters.zero_sequence_resistance,
        zero_sequence_reactance: project.data.line_parameters.zero_sequence_reactance,
        route_length: project.data.line_parameters.route_length
      },
      ieds: project.data.ied_list.map(ied => ({
        ied_name: ied.ied_name,
        ct_ratio: ied.standard_parameters.ct_ratio || '1600/1A',
        accuracy_class: ied.standard_parameters.accuracy_class || '5P20',
        ct_resistance: ied.standard_parameters.ct_resistance || 1.5,
        magnetizing_current: ied.standard_parameters.magnetizing_current || 10,
        knee_point_voltage: ied.standard_parameters.knee_point_voltage || 1000
      }))
    };
  }

  /**
   * Compare two projects (Your enhancement #7)
   */
  static compareProjects(project1: Project, project2: Project): ProjectComparison {
    return {
      project1: {
        name: project1.project_info.name,
        suitable_ieds: project1.results?.overall_summary.suitable_ieds || 0,
        total_ieds: project1.results?.overall_summary.total_ieds_checked || 0,
        overall_verdict: project1.results?.overall_summary.overall_verdict || 'UNKNOWN'
      },
      project2: {
        name: project2.project_info.name,
        suitable_ieds: project2.results?.overall_summary.suitable_ieds || 0,
        total_ieds: project2.results?.overall_summary.total_ieds_checked || 0,
        overall_verdict: project2.results?.overall_summary.overall_verdict || 'UNKNOWN'
      },
      differences: {
        system_differences: this.compareSystemParams(project1.data.general_inputs, project2.data.general_inputs),
        ied_differences: this.compareIEDLists(project1.data.ied_list, project2.data.ied_list)
      }
    };
  }

  /**
   * Get project statistics
   */
  static getProjectStats(projects: Project[]): ProjectStats {
    const total = projects.length;
    const draft = projects.filter(p => p.status === 'draft').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const archived = projects.filter(p => p.status === 'archived').length;
    
    const completedProjects = projects.filter(p => p.results);
    const allSuitable = completedProjects.filter(p => p.results!.overall_summary.overall_verdict === 'ALL_SUITABLE').length;
    
    return {
      total_projects: total,
      draft_projects: draft,
      completed_projects: completed,
      archived_projects: archived,
      success_rate: completed > 0 ? (allSuitable / completed) * 100 : 0,
      total_ieds_analyzed: completedProjects.reduce((sum, p) => sum + (p.results!.overall_summary.total_ieds_checked || 0), 0)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private static generateProjectId(): string {
    return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private static compareSystemParams(params1: Project['data']['general_inputs'], params2: Project['data']['general_inputs']): string[] {
    const differences: string[] = [];
    
    if (params1.bus_fault_level !== params2.bus_fault_level) {
      differences.push(`Fault Level: ${params1.bus_fault_level}kA vs ${params2.bus_fault_level}kA`);
    }
    if (params1.voltage_level !== params2.voltage_level) {
      differences.push(`Voltage: ${params1.voltage_level}kV vs ${params2.voltage_level}kV`);
    }
    if (params1.frequency !== params2.frequency) {
      differences.push(`Frequency: ${params1.frequency}Hz vs ${params2.frequency}Hz`);
    }
    if (params1.xr_ratio !== params2.xr_ratio) {
      differences.push(`X/R Ratio: ${params1.xr_ratio} vs ${params2.xr_ratio}`);
    }
    
    return differences;
  }

  private static compareIEDLists(ieds1: Project['data']['ied_list'], ieds2: Project['data']['ied_list']): string[] {
    const differences: string[] = [];
    
    const names1 = ieds1.map(ied => ied.ied_name);
    const names2 = ieds2.map(ied => ied.ied_name);
    
    const onlyIn1 = names1.filter(name => !names2.includes(name));
    const onlyIn2 = names2.filter(name => !names1.includes(name));
    
    if (onlyIn1.length > 0) {
      differences.push(`Only in Project 1: ${onlyIn1.join(', ')}`);
    }
    if (onlyIn2.length > 0) {
      differences.push(`Only in Project 2: ${onlyIn2.join(', ')}`);
    }
    
    return differences;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORTING INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectComparison {
  project1: {
    name: string;
    suitable_ieds: number;
    total_ieds: number;
    overall_verdict: string;
  };
  project2: {
    name: string;
    suitable_ieds: number;
    total_ieds: number;
    overall_verdict: string;
  };
  differences: {
    system_differences: string[];
    ied_differences: string[];
  };
}

export interface ProjectStats {
  total_projects: number;
  draft_projects: number;
  completed_projects: number;
  archived_projects: number;
  success_rate: number; // Percentage
  total_ieds_analyzed: number;
}