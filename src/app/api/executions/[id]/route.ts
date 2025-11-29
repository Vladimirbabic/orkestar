import { NextRequest, NextResponse } from 'next/server';
import { getExecutionDetails } from '@/lib/executionService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const details = await getExecutionDetails(id, userId);
    
    if (!details) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json(details);
  } catch (error) {
    console.error('Error fetching execution details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution details' },
      { status: 500 }
    );
  }
}


