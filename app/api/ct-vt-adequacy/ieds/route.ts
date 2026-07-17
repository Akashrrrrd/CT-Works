/**
 * IED DATABASE API ENDPOINT
 * Provides available IEDs and their specifications
 */

import { NextResponse } from 'next/server';
import { IEDDatabaseService } from '@/lib/services/ied-database';

export async function GET() {
  try {
    const availableIEDs = IEDDatabaseService.getAllAvailableIEDs();
    
    const iedList = availableIEDs.map(iedName => {
      const spec = IEDDatabaseService.getIEDSpecification(iedName);
      const burden = IEDDatabaseService.getIEDBurden(iedName);
      
      return {
        name: iedName,
        burden_va: burden,
        type: spec?.type || 'PROTECTION',
        manufacturer: spec?.manufacturer || 'Unknown',
        calculation_method: spec?.calculation_method || 'VK_METHOD',
        applications: spec?.typical_applications || []
      };
    });
    
    return NextResponse.json({
      total_ieds: iedList.length,
      protection_ieds: iedList.filter(ied => ied.type === 'PROTECTION').length,
      metering_ieds: iedList.filter(ied => ied.type === 'METERING').length,
      control_ieds: iedList.filter(ied => ied.type === 'CONTROL').length,
      ieds: iedList
    });
    
  } catch (error) {
    console.error('IED database error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve IED database' },
      { status: 500 }
    );
  }
}