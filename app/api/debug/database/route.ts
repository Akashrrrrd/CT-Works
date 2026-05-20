/**
 * Database Debug API Endpoint
 * Tests database connection and provides status information
 */

import { NextRequest, NextResponse } from 'next/server';
import { testDatabaseConnection, testCollectionOperations } from '@/lib/database/test-connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const test = searchParams.get('test') || 'connection';
    
    let result;
    
    switch (test) {
      case 'connection':
        result = await testDatabaseConnection();
        break;
        
      case 'operations':
        result = await testCollectionOperations();
        break;
        
      case 'both':
        const connectionResult = await testDatabaseConnection();
        const operationsResult = await testCollectionOperations();
        result = {
          connection: connectionResult,
          operations: operationsResult,
          success: connectionResult.success && operationsResult.success
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid test parameter. Use: connection, operations, or both' },
          { status: 400 }
        );
    }
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 500
    });
    
  } catch (error) {
    console.error('Database debug API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'test_connection':
        const result = await testDatabaseConnection();
        return NextResponse.json(result);
        
      case 'test_operations':
        const opsResult = await testCollectionOperations();
        return NextResponse.json(opsResult);
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: test_connection or test_operations' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Database debug API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}