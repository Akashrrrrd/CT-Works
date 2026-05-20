import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { testDatabaseConnection } from '@/lib/database/test-connection';

export async function GET(request: NextRequest) {
  // Get current user info
  const token = request.cookies.get('auth-token')?.value;
  let currentUser = null;
  
  if (token) {
    try {
      currentUser = await verifyJWT(token);
    } catch (error) {
      // Token invalid
    }
  }

  // Test database connection
  let databaseStatus = null;
  try {
    databaseStatus = await testDatabaseConnection();
  } catch (error) {
    databaseStatus = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  return NextResponse.json({
    has_db_url:     !!process.env.DATABASE_URL,
    has_jwt_secret: !!process.env.JWT_SECRET,
    has_db_name:    !!process.env.DB_NAME,
    node_env:       process.env.NODE_ENV,
    current_user:   currentUser ? {
      id: currentUser.userId,
      email: currentUser.email,
      role: currentUser.role
    } : null,
    auth_token_present: !!token,
    database: databaseStatus
  });
}
