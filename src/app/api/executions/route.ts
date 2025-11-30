import { NextRequest, NextResponse } from 'next/server';
import { getExecutions } from '@/lib/executionService';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const executions = await getExecutions(userId, workflowId, limit);
    
    return NextResponse.json({ executions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}




