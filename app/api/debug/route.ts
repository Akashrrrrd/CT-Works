import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    has_db_url:     !!process.env.DATABASE_URL,
    has_jwt_secret: !!process.env.JWT_SECRET,
    has_db_name:    !!process.env.DB_NAME,
    node_env:       process.env.NODE_ENV,
  });
}
