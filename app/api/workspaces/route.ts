import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: 'ws-33kv-df5w',
      name: '33kV DF5W SS – CT/VT Adequacy',
      description: 'CT/VT Adequacy Check for 33kV Cable Feeders | Contract: N-19957.1-DF5W',
      createdAt: '2026-03-16T00:00:00.000Z',
    },
  ]);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json(
    {
      id: `ws-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      createdAt: new Date().toISOString(),
    },
    { status: 201 }
  );
}
