import { NextRequest, NextResponse } from 'next/server';
import { getComputations, getTemplates, getUsers, getWorkspaces, getApprovals, getAuditLogs, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { calculateCTAdequacy } from '@/lib/services/ct-adequacy';
import { 
  performProjectCalculation, 
  convertLegacyInput, 
  calculateProjectCTAdequacy,
  type IEDTemplateType 
} from '@/lib/services/project-calculations';
import { runFullAnalysis, type FullAnalysisInput } from '@/lib/services/calculation-engine';
import type { Sheet1Inputs, Sheet2Inputs } from '@/lib/services/ct-adequacy';

async function auth(request: NextRequest) {
  // Middleware forwards verified user info via headers
  const userId = request.headers.get('x-user-id');
  const email  = request.headers.get('x-user-email');
  const role   = request.headers.get('x-user-role');
  if (userId && email && role) {
    return { userId, email, role } as { userId: string; email: string; role: string };
  }
  // Fallback: verify cookie directly
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }      = await params;
    const currentUser = await auth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const computations = await getComputations();
    const list = await computations
      .find({ workspaceId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(list.map(c => ({
      id:             c._id.toString(),
      templateId:     c.templateId?.toString(),
      templateName:   c.templateName,
      verdict:        c.verdict,
      vk_required:    c.vk_required,
      vk_available:   c.vk_available,
      ealreq_max:     c.ealreq_max,
      vk_breakdown:   c.vk_breakdown  ?? [],
      intermediates:  c.intermediates ?? {},
      sheet1:         c.sheet1        ?? {},
      sheet2:         c.sheet2        ?? {},
      approvalStatus: c.approvalStatus ?? 'PENDING',
      createdAt:      c.createdAt,
      createdBy:      c.createdBy     ?? { name: 'Unknown', email: '' },
    })));
  } catch (error) {
    console.error('Computations GET error:', error);
    return NextResponse.json({ error: 'Failed to load computations' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }      = await params;
    const currentUser = await auth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { templateId, sheet1, sheet2 } = body as {
      templateId: string;
      sheet1: Sheet1Inputs;
      sheet2: Sheet2Inputs;
    };

    console.log('API Received sheet1:', {
      ct_ratio_primary: sheet1.ct_ratio_primary,
      ct_resistance: sheet1.ct_resistance,
      resistance_20c: sheet1.resistance_20c,
      cable_length: sheet1.cable_length,
      accuracy_limit_factor: sheet1.accuracy_limit_factor
    });

    if (!templateId || !sheet1 || !sheet2) {
      return NextResponse.json({ error: 'templateId, sheet1 and sheet2 are required' }, { status: 400 });
    }

    // Load template to get iedType
    const templates = await getTemplates();
    let template;
    
    // Try to find by ObjectId
    try {
      template = await templates.findOne({ _id: new ObjectId(templateId) });
    } catch (e) {
      // If invalid ObjectId, try string match
      template = await templates.findOne({ id: templateId });
    }
    
    if (!template) {
      console.error(`Template not found with ID: ${templateId}`);
      return NextResponse.json({ error: `Template not found: ${templateId}` }, { status: 404 });
    }

    let result: any;

    // Check if this is one of our IED templates that should use the new calculation system
    const iedTemplateMap: Record<string, IEDTemplateType> = {
      'tpl-siemens-7sj85': 'SIEMENS_7SJ85',
      'tpl-abb-ret670': 'ABB_RET670', 
      'tpl-red670': 'RED670',
      'SIEMENS 7SJ85': 'SIEMENS_7SJ85',
      'ABB RET670': 'ABB_RET670',
      'RED670': 'RED670'
    };

    const iedTemplateType = iedTemplateMap[template.iedType] || iedTemplateMap[template.name];

    if (iedTemplateType === 'SIEMENS_7SJ85') {
      // Use Siemens 7SJ85 calculation directly with proper data mapping
      try {
        console.log('Loading Siemens7SJ85Calculator for template:', template.name, 'iedType:', template.iedType);
        const { Siemens7SJ85Calculator } = await import('@/lib/services/siemens-7sj85-calculations');
        console.log('Siemens7SJ85Calculator loaded successfully');
        
        // Build the calculator input from sheet1 and sheet2
        // Sheet1 contains CT parameters, Sheet2 contains system/wiring parameters
        const calculatorInput = {
          ct_wiring: {
            ct_conductor_cross_section: sheet1.conductor_cross_section || 2.5,
            ct_resistance_w_km_20c: sheet1.resistance_20c || 7.41,
            ct_specific_resistance_20c: sheet1.temp_coefficient || 0.00393,
            ct_conductor_length_m: sheet1.cable_length || 50,
            relay_rated_current: sheet1.ct_ratio_secondary || 1
          },
          system: {
            system_frequency: sheet2.system_frequency || 50,
            bus_voltage_level: sheet2.bus_voltage || 33,
            max_bus_fault_level: sheet2.max_fault_current || 12.5,
            xr_ratio: sheet2.xr_ratio || 15,
            max_hv_busbar_fault_current: (sheet2.max_fault_current || 12.5) * 1000,
            hv_rating_of_busbar: (sheet2.bus_voltage || 33) * 1000
          },
          power_line: {
            positive_seq_resistance_r1: sheet2.positive_seq_resistance || 0.0221,
            positive_seq_reactance_x1: sheet2.positive_seq_reactance || 0.1600,
            zero_seq_resistance_r0: sheet2.zero_seq_resistance || 0.1300,
            zero_seq_reactance_x0: sheet2.zero_seq_reactance || 0.0600,
            route_length: sheet2.line_length || 1.74,
            cable_positive_seq_impedance: Math.sqrt(
              Math.pow(sheet2.positive_seq_resistance || 0.0221, 2) + 
              Math.pow(sheet2.positive_seq_reactance || 0.1600, 2)
            ),
            cable_zero_seq_impedance: Math.sqrt(
              Math.pow(sheet2.zero_seq_resistance || 0.1300, 2) + 
              Math.pow(sheet2.zero_seq_reactance || 0.0600, 2)
            ),
            total_cable_positive_seq_impedance: Math.sqrt(
              Math.pow((sheet2.positive_seq_resistance || 0.0221) * (sheet2.line_length || 1.74), 2) + 
              Math.pow((sheet2.positive_seq_reactance || 0.1600) * (sheet2.line_length || 1.74), 2)
            ),
            total_cable_zero_seq_impedance: Math.sqrt(
              Math.pow((sheet2.zero_seq_resistance || 0.1300) * (sheet2.line_length || 1.74), 2) + 
              Math.pow((sheet2.zero_seq_reactance || 0.0600) * (sheet2.line_length || 1.74), 2)
            ),
            source_impedance_zs: 0,
            impedance_angle_in_radians: Math.atan(sheet2.xr_ratio || 15)
          },
          ct_core: {
            ct_ratio_primary: sheet1.ct_ratio_primary || 600,
            ct_ratio_secondary: sheet1.ct_ratio_secondary || 1,
            class_of_accuracy: sheet1.accuracy_class || '5P20',
            ct_resistance: sheet1.ct_resistance || 3.5,
            rated_burden: sheet1.rated_burden || 15,
            CT_Accuracy_Limit_Factor: sheet1.accuracy_limit_factor || 20,
            vk_available: sheet1.knee_point_voltage || 400
          },
          connected_devices: [
            { 
              device_name: template.name || 'SIEMENS 7SJ85', 
              burden_va: sheet1.ied_burden || 0.02 
            }
          ],
          accuracy_limit_factor: sheet1.accuracy_limit_factor || 20
        };

        // Call Siemens7SJ85Calculator directly
        try {
          const calcResult = Siemens7SJ85Calculator.performCompleteCalculation(calculatorInput);

          result = {
            verdict: calcResult.verdict === 'SUITABLY DIMENSIONED' ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED',
            ealreq_max: calcResult.ealreq_max || 0,
            vk_required: calcResult.vk_required || 0,
            vk_available: calcResult.vk_available || 0,
            vk_breakdown: calcResult.vk_breakdown || [],
            intermediates: {
              template_type: 'SIEMENS_7SJ85',
              calculation_method: 'Siemens 7SJ85 Direct Calculation',
              hitachi_reference: 'N-19957 2-DF4W',
              required_kssc: calcResult.required_kssc || 0,
              available_kssc: calcResult.available_kssc || 0,
              ct_calculations: calcResult.ct_calculations,
              burden_calculations: calcResult.burden_calculations,
              fault_calculations: calcResult.fault_calculations,
              adequacy_check: calcResult.adequacy_check
            }
          };
        } catch (calcError) {
          console.error('Calculator error details:', {
            error: calcError instanceof Error ? calcError.message : calcError,
            calculatorInput: calculatorInput
          });
          throw calcError;
        }

      } catch (error) {
        console.error('Siemens 7SJ85 calculation failed:', error);
        throw error;
      }
    } else if (iedTemplateType) {
      // For other IED templates (ABB_RET670, RED670)
      // Use the project calculation service
      try {
        const fullAnalysisInput: FullAnalysisInput = {
          ct: {
            ratio_primary: sheet1.ct_ratio_primary || 2000,
            ratio_secondary: sheet1.ct_ratio_secondary || 1,
            accuracy_class: sheet1.accuracy_class || '5P20',
            rct: sheet1.ct_resistance || 0.5,
            rated_burden_va: sheet1.rated_burden || 7.5,
            alf: sheet1.accuracy_limit_factor || 10,
            vk_available: sheet1.knee_point_voltage || 1000,
            io_at_vk: sheet1.magnetizing_current || 10
          },
          wiring: {
            conductor_mm2: sheet1.conductor_cross_section || 6.0,
            r20: sheet1.resistance_20c || 3.69,
            alpha: sheet1.temp_coefficient || 0.00393,
            temperature: sheet1.operating_temperature || 75,
            cable_length_m: sheet1.cable_length || 120,
            cores: 2
          },
          ieds: [{
            name: template.name,
            burden_va: sheet1.ied_burden || 0.02,
            type: 'protection'
          }],
          system: {
            frequency: sheet2.system_frequency || 50,
            bus_voltage_kv: sheet2.bus_voltage || 132,
            fault_current_ka: sheet2.max_fault_current || 50,
            xr_ratio: sheet2.xr_ratio || 15
          },
          line: {
            r1: sheet2.positive_seq_resistance || 0.0221,
            x1: sheet2.positive_seq_reactance || 0.1600,
            r0: sheet2.zero_seq_resistance || 0.1300,
            x0: sheet2.zero_seq_reactance || 0.0600,
            length_km: sheet2.line_length || 1.74
          }
        };

        const projectResult = await calculateProjectCTAdequacy(
          fullAnalysisInput,
          iedTemplateType,
          {
            project_id: `proj_${templateId}`,
            workspace_id: id,
            calculated_by: currentUser.email
          }
        );

        result = {
          verdict: projectResult.final_verdict === 'SUITABLY DIMENSIONED' ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED',
          ealreq_max: projectResult.detailed_results?.ct_adequacy_check?.highest_ealreq || 
                     projectResult.detailed_results?.ealreq_calculations?.highest_ealreq || 0,
          vk_required: projectResult.detailed_results?.ct_adequacy_check?.required_vk || 0,
          vk_available: projectResult.detailed_results?.ct_adequacy_check?.available_vk || 0,
          vk_breakdown: [],
          intermediates: {
            template_type: iedTemplateType,
            calculation_method: 'IED Template',
            hitachi_reference: projectResult.hitachi_reference.document_no,
            validation_passed: projectResult.validation?.passed || false,
            ...projectResult.detailed_results?.intermediates
          }
        };

      } catch (error) {
        console.error('IED template calculation failed:', error);
        throw error;
      }
    } else {
      // Use legacy calculation for non-IED templates
      result = calculateCTAdequacy(template.iedType, sheet1, sheet2);
      result.intermediates = {
        ...result.intermediates,
        calculation_method: 'Legacy'
      };
    }

    // Fetch user info for audit
    const users = await getUsers();
    const user  = await users.findOne({ _id: new ObjectId(currentUser.userId) });

    const now = new Date();
    const computations = await getComputations();
    const insertResult = await computations.insertOne({
      workspaceId:    new ObjectId(id),
      templateId:     template._id,
      templateName:   template.name,
      iedType:        template.iedType,
      sheet1,
      sheet2,
      approvalStatus: 'PENDING',
      createdById:    new ObjectId(currentUser.userId),
      createdBy:      { name: user?.name ?? 'Unknown', email: user?.email ?? '' },
      createdAt:      now,
      updatedAt:      now,
      verdict:        result.verdict,
      ealreq_max:     result.ealreq_max,
      vk_required:    result.vk_required,
      vk_available:   result.vk_available,
      vk_breakdown:   result.vk_breakdown,
      intermediates:  result.intermediates,
    });

    const compId = insertResult.insertedId;

    // Create approval record in MongoDB
    const approvals = await getApprovals();
    await approvals.insertOne({
      workspaceId:   new ObjectId(id),
      computationId: compId,
      status:        'PENDING',
      createdAt:     now,
      updatedAt:     now,
    });

    // Audit log
    const audit = await getAuditLogs();
    await audit.insertOne({
      workspaceId:  new ObjectId(id),
      userId:       new ObjectId(currentUser.userId),
      userName:     user?.name ?? currentUser.email,
      action:       'COMPUTATION_CREATED',
      resourceType: 'Computation',
      resourceId:   compId.toString(),
      details:      `${template.name} — ${result.verdict}`,
      createdAt:    now,
    });

    return NextResponse.json({
      id:             compId.toString(),
      templateName:   template.name,
      ...result,
      approvalStatus: 'PENDING',
      createdAt:      now,
    }, { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('Computation POST error:', errorMessage, error);
    return NextResponse.json({ 
      error: 'Failed to run computation',
      details: errorMessage 
    }, { status: 500 });
  }
}
