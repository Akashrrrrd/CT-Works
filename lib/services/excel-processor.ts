// Advanced Excel Processing Service
import * as XLSX from 'xlsx';

export interface ExcelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  extractedData?: {
    ctData: CTData[];
    systemData: SystemData;
    iedData: IEDData[];
  };
}

export interface CTData {
  id: string;
  ratio_primary: number;
  ratio_secondary: number;
  accuracy_class: string;
  resistance: number;
  knee_point_voltage: number;
  magnetizing_current: number;
  location: string;
  bay: string;
}

export interface SystemData {
  voltage_level: number;
  fault_level_mva: number;
  frequency: number;
  x_r_ratio: number;
}

export interface IEDData {
  id: string;
  type: string;
  manufacturer: string;
  model: string;
  burden_va: number;
  connected_ct_ids: string[];
}

export class ExcelProcessor {
  private static readonly SUPPORTED_FORMATS = [
    '.xlsx', '.xls', '.csv'
  ];

  private static readonly CT_SHEET_PATTERNS = [
    'CT Data', 'Current Transformers', 'CT Parameters', 'Sheet1'
  ];

  private static readonly SYSTEM_SHEET_PATTERNS = [
    'System Data', 'Fault Levels', 'Network Parameters', 'Sheet2'
  ];

  static async processExcelFile(
    file: File,
    templateType: 'hitachi' | 'abb' | 'siemens' | 'generic' = 'generic'
  ): Promise<ExcelValidationResult> {
    try {
      // Validate file format
      const formatValidation = this.validateFileFormat(file);
      if (!formatValidation.isValid) {
        return formatValidation;
      }

      // Read Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Extract data based on template type
      const extractedData = await this.extractDataByTemplate(workbook, templateType);
      
      // Validate extracted data
      const validation = this.validateExtractedData(extractedData);
      
      return {
        isValid: validation.errors.length === 0,
        errors: validation.errors,
        warnings: validation.warnings,
        extractedData: validation.errors.length === 0 ? extractedData : undefined
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  private static validateFileFormat(file: File): ExcelValidationResult {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!this.SUPPORTED_FORMATS.includes(extension)) {
      return {
        isValid: false,
        errors: [`Unsupported file format: ${extension}. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`],
        warnings: []
      };
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return {
        isValid: false,
        errors: ['File size exceeds 50MB limit'],
        warnings: []
      };
    }

    return { isValid: true, errors: [], warnings: [] };
  }

  private static async extractDataByTemplate(
    workbook: XLSX.WorkBook,
    templateType: string
  ): Promise<{ ctData: CTData[]; systemData: SystemData; iedData: IEDData[] }> {
    
    switch (templateType) {
      case 'hitachi':
        return this.extractHitachiTemplate(workbook);
      case 'abb':
        return this.extractABBTemplate(workbook);
      case 'siemens':
        return this.extractSiemensTemplate(workbook);
      default:
        return this.extractGenericTemplate(workbook);
    }
  }

  private static extractHitachiTemplate(workbook: XLSX.WorkBook) {
    // Hitachi-specific Excel format parsing
    const ctSheet = this.findSheet(workbook, this.CT_SHEET_PATTERNS);
    const systemSheet = this.findSheet(workbook, this.SYSTEM_SHEET_PATTERNS);

    const ctData: CTData[] = [];
    const iedData: IEDData[] = [];
    
    if (ctSheet) {
      const data = XLSX.utils.sheet_to_json(ctSheet, { header: 1 }) as any[][];
      
      // Parse CT data starting from row with headers
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row && row.length >= 6) {
          ctData.push({
            id: `CT_${i}`,
            ratio_primary: this.parseNumber(row[0]),
            ratio_secondary: this.parseNumber(row[1]) || 1,
            accuracy_class: String(row[2] || 'PX'),
            resistance: this.parseNumber(row[3]),
            knee_point_voltage: this.parseNumber(row[4]),
            magnetizing_current: this.parseNumber(row[5]),
            location: String(row[6] || ''),
            bay: String(row[7] || '')
          });
        }
      }
    }

    const systemData: SystemData = {
      voltage_level: 33, // Default values - should be extracted from sheet
      fault_level_mva: 750,
      frequency: 50,
      x_r_ratio: 15
    };

    return { ctData, systemData, iedData };
  }

  private static extractABBTemplate(workbook: XLSX.WorkBook) {
    // ABB-specific format parsing
    return this.extractGenericTemplate(workbook);
  }

  private static extractSiemensTemplate(workbook: XLSX.WorkBook) {
    // Siemens-specific format parsing
    return this.extractGenericTemplate(workbook);
  }

  private static extractGenericTemplate(workbook: XLSX.WorkBook) {
    // Generic Excel format parsing with intelligent column detection
    const ctData: CTData[] = [];
    const iedData: IEDData[] = [];
    
    // Try to find CT data in any sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Look for CT-related headers
      const headerRow = this.findHeaderRow(data, ['ratio', 'primary', 'secondary', 'ct']);
      if (headerRow >= 0) {
        const headers = data[headerRow].map((h: any) => String(h).toLowerCase());
        
        for (let i = headerRow + 1; i < data.length; i++) {
          const row = data[i];
          if (row && row.some((cell: any) => cell !== null && cell !== undefined && cell !== '')) {
            const ctItem = this.parseGenericCTRow(row, headers, i);
            if (ctItem) ctData.push(ctItem);
          }
        }
      }
    }

    const systemData: SystemData = {
      voltage_level: 33,
      fault_level_mva: 750,
      frequency: 50,
      x_r_ratio: 15
    };

    return { ctData, systemData, iedData };
  }

  private static findSheet(workbook: XLSX.WorkBook, patterns: string[]): XLSX.WorkSheet | null {
    for (const pattern of patterns) {
      const sheet = workbook.Sheets[pattern];
      if (sheet) return sheet;
      
      // Try case-insensitive match
      for (const sheetName of workbook.SheetNames) {
        if (sheetName.toLowerCase().includes(pattern.toLowerCase())) {
          return workbook.Sheets[sheetName];
        }
      }
    }
    return null;
  }

  private static findHeaderRow(data: any[][], keywords: string[]): number {
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (row && row.some((cell: any) => {
        const cellStr = String(cell).toLowerCase();
        return keywords.some(keyword => cellStr.includes(keyword));
      })) {
        return i;
      }
    }
    return -1;
  }

  private static parseGenericCTRow(row: any[], headers: string[], index: number): CTData | null {
    try {
      // Map common column patterns
      const primaryIdx = headers.findIndex(h => h.includes('primary') || h.includes('ipn'));
      const secondaryIdx = headers.findIndex(h => h.includes('secondary') || h.includes('isn'));
      const classIdx = headers.findIndex(h => h.includes('class') || h.includes('accuracy'));
      const resistanceIdx = headers.findIndex(h => h.includes('resistance') || h.includes('rct'));
      const vkIdx = headers.findIndex(h => h.includes('knee') || h.includes('vk'));
      const ioIdx = headers.findIndex(h => h.includes('magnetiz') || h.includes('io'));

      if (primaryIdx >= 0 && row[primaryIdx]) {
        return {
          id: `CT_${index}`,
          ratio_primary: this.parseNumber(row[primaryIdx]),
          ratio_secondary: secondaryIdx >= 0 ? this.parseNumber(row[secondaryIdx]) || 1 : 1,
          accuracy_class: classIdx >= 0 ? String(row[classIdx] || 'PX') : 'PX',
          resistance: resistanceIdx >= 0 ? this.parseNumber(row[resistanceIdx]) || 0 : 0,
          knee_point_voltage: vkIdx >= 0 ? this.parseNumber(row[vkIdx]) || 0 : 0,
          magnetizing_current: ioIdx >= 0 ? this.parseNumber(row[ioIdx]) || 0 : 0,
          location: '',
          bay: ''
        };
      }
    } catch (error) {
      console.warn(`Failed to parse CT row ${index}:`, error);
    }
    return null;
  }

  private static parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private static validateExtractedData(data: {
    ctData: CTData[];
    systemData: SystemData;
    iedData: IEDData[];
  }): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate CT data
    if (data.ctData.length === 0) {
      errors.push('No CT data found in Excel file');
    }

    data.ctData.forEach((ct, index) => {
      if (!ct.ratio_primary || ct.ratio_primary <= 0) {
        errors.push(`CT ${index + 1}: Invalid primary ratio`);
      }
      if (!ct.ratio_secondary || ct.ratio_secondary <= 0) {
        errors.push(`CT ${index + 1}: Invalid secondary ratio`);
      }
      if (!ct.knee_point_voltage || ct.knee_point_voltage <= 0) {
        warnings.push(`CT ${index + 1}: Missing or invalid knee point voltage`);
      }
      if (!ct.resistance || ct.resistance < 0) {
        warnings.push(`CT ${index + 1}: Missing or invalid resistance`);
      }
    });

    // Validate system data
    if (!data.systemData.voltage_level || data.systemData.voltage_level <= 0) {
      warnings.push('System voltage level not specified, using default');
    }
    if (!data.systemData.fault_level_mva || data.systemData.fault_level_mva <= 0) {
      warnings.push('Fault level not specified, using default');
    }

    return { errors, warnings };
  }
}