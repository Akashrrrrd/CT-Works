/**
 * POST /api/workspaces/[id]/import-excel
 * Accepts a multipart/form-data upload of an Excel (.xlsx/.xls) or CSV file.
 * Parses it and returns structured FullAnalysisInput ready for the calculation engine.
 *
 * Expected Excel structure (row-based key:value pairs):
 *   Sheet "CT"     → CT parameters
 *   Sheet "VT"     → VT parameters
 *   Sheet "Wiring" → Wiring parameters
 *   Sheet "IEDs"   → IED table (Name | Burden VA | Type)
 *   Sheet "System" → System parameters
 *   Sheet "Line"   → Line parameters
 *
 * Falls back to scanning all sheets for known key names.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

// Key aliases — maps common Excel header names to our field names
const KEY_MAP: Record<string, string> = {
  // CT
  'ct ratio primary':    'ct.ratio_primary',
  'ct primary':          'ct.ratio_primary',
  'ipn':                 'ct.ratio_primary',
  'ct ratio secondary':  'ct.ratio_secondary',
  'ct secondary':        'ct.ratio_secondary',
  'in':                  'ct.ratio_secondary',
  'accuracy class':      'ct.accuracy_class',
  'class':               'ct.accuracy_class',
  'rct':                 'ct.rct',
  'ct resistance':       'ct.rct',
  'rated burden':        'ct.rated_burden_va',
  'rated burden va':     'ct.rated_burden_va',
  'pn':                  'ct.rated_burden_va',
  'alf':                 'ct.alf',
  'accuracy limit factor': 'ct.alf',
  'vk':                  'ct.vk_available',
  'knee point voltage':  'ct.vk_available',
  'vk available':        'ct.vk_available',
  'io':                  'ct.io_at_vk',
  'io at vk':            'ct.io_at_vk',
  // Wiring
  'conductor mm2':       'wiring.conductor_mm2',
  'cross section':       'wiring.conductor_mm2',
  'r20':                 'wiring.r20',
  'resistance at 20':    'wiring.r20',
  'alpha':               'wiring.alpha',
  'temperature coefficient': 'wiring.alpha',
  'temperature':         'wiring.temperature',
  'cable length':        'wiring.cable_length_m',
  'cable length m':      'wiring.cable_length_m',
  'cores':               'wiring.cores',
  // System
  'frequency':           'system.frequency',
  'bus voltage':         'system.bus_voltage_kv',
  'bus voltage kv':      'system.bus_voltage_kv',
  'fault current':       'system.fault_current_ka',
  'fault current ka':    'system.fault_current_ka',
  'max fault':           'system.fault_current_ka',
  'x/r':                 'system.xr_ratio',
  'xr ratio':            'system.xr_ratio',
  'x/r ratio':           'system.xr_ratio',
  // Line
  'r1':                  'line.r1',
  'x1':                  'line.x1',
  'r0':                  'line.r0',
  'x0':                  'line.x0',
  'line length':         'line.length_km',
  'length km':           'line.length_km',
  'route length':        'line.length_km',
};

function setNested(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function parseValue(v: unknown): unknown {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^\d.-]/g, ''));
    return isNaN(n) ? v : n;
  }
  return v;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      return NextResponse.json({ error: 'Only .xlsx, .xls and .csv files are supported' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: { key: string; value: unknown }[] = [];
    const ieds: { name: string; burden_va: number; type: string }[] = [];

    if (ext === 'csv') {
      // Parse CSV — expect "Key,Value" format
      const text = buffer.toString('utf8');
      for (const line of text.split('\n')) {
        const [k, v] = line.split(',');
        if (k && v) rows.push({ key: k.trim().toLowerCase(), value: v.trim() });
      }
    } else {
      // Parse Excel using xlsx (dynamic import — browser-safe)
      const XLSX = await import('xlsx');
      const wb   = XLSX.read(buffer, { type: 'buffer' });

      for (const sheetName of wb.SheetNames) {
        const ws   = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 }) as unknown[][];

        // IED sheet — table format: Name | Burden VA | Type
        if (sheetName.toLowerCase().includes('ied') || sheetName.toLowerCase().includes('relay')) {
          for (let i = 1; i < data.length; i++) {
            const row = data[i] as unknown[];
            if (row[0] && row[1]) {
              ieds.push({
                name:       String(row[0]),
                burden_va:  parseFloat(String(row[1])) || 0,
                type:       String(row[2] ?? 'protection'),
              });
            }
          }
          continue;
        }

        // Key-value sheets
        for (const row of data) {
          const r = row as unknown[];
          if (r[0] && r[1] !== undefined) {
            rows.push({ key: String(r[0]).trim().toLowerCase(), value: r[1] });
          }
        }
      }
    }

    // Map rows to structured input
    const result: Record<string, unknown> = {
      ct:     { alf: 20, io_at_vk: 0 },
      wiring: { alpha: 0.00393, temperature: 75, cores: 2 },
      system: { frequency: 50 },
      line:   {},
      ieds,
    };

    for (const { key, value } of rows) {
      const mapped = KEY_MAP[key];
      if (mapped) setNested(result, mapped, parseValue(value));
    }

    // Validate minimum required fields
    const missing: string[] = [];
    const ct = result.ct as Record<string, unknown>;
    if (!ct?.ratio_primary)   missing.push('CT Primary Ratio');
    if (!ct?.ratio_secondary) missing.push('CT Secondary Ratio');
    if (!ct?.rct)             missing.push('Rct');
    if (!(result.system as Record<string, unknown>)?.bus_voltage_kv) missing.push('Bus Voltage');

    return NextResponse.json({
      parsed:  result,
      missing,
      rowCount: rows.length,
      iedCount: ieds.length,
      warnings: missing.length > 0 ? [`Missing fields: ${missing.join(', ')}`] : [],
    });

  } catch (error) {
    console.error('Excel import error:', error);
    return NextResponse.json({ error: 'Failed to parse file. Check format.' }, { status: 500 });
  }
}
