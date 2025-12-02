import { createClient } from '@supabase/supabase-js';

// Types
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  user_id: string;
  trigger_type: 'manual' | 'webhook' | 'schedule';
  trigger_data: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  total_duration_ms: number | null;
}

export interface ExecutionStep {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  node_label: string | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  duration_ms: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

// Create Supabase client for execution logging
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Start a new execution
export async function startExecution(
  workflowId: string,
  userId: string,
  triggerType: 'manual' | 'webhook' | 'schedule',
  triggerData: Record<string, unknown> = {}
): Promise<WorkflowExecution> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_id: workflowId,
      user_id: userId,
      trigger_type: triggerType,
      trigger_data: triggerData,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error starting execution:', error);
    throw error;
  }

  return data;
}

// Complete an execution
export async function completeExecution(
  executionId: string,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Get the execution to calculate duration
  const { data: execution } = await supabase
    .from('workflow_executions')
    .select('started_at')
    .eq('id', executionId)
    .single();

  const completedAt = new Date();
  const startedAt = execution?.started_at ? new Date(execution.started_at) : completedAt;
  const durationMs = completedAt.getTime() - startedAt.getTime();

  const { error } = await supabase
    .from('workflow_executions')
    .update({
      status,
      completed_at: completedAt.toISOString(),
      error_message: errorMessage || null,
      total_duration_ms: durationMs,
    })
    .eq('id', executionId);

  if (error) {
    console.error('Error completing execution:', error);
    throw error;
  }
}

// Start a step
export async function startStep(
  executionId: string,
  nodeId: string,
  nodeType: string,
  nodeLabel: string,
  input: Record<string, unknown> | null = null
): Promise<ExecutionStep> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('execution_steps')
    .insert({
      execution_id: executionId,
      node_id: nodeId,
      node_type: nodeType,
      node_label: nodeLabel,
      input,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error starting step:', error);
    throw error;
  }

  return data;
}

// Complete a step
export async function completeStep(
  stepId: string,
  status: 'completed' | 'failed' | 'skipped',
  output: Record<string, unknown> | null = null,
  errorMessage?: string
): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Get the step to calculate duration
  const { data: step } = await supabase
    .from('execution_steps')
    .select('started_at')
    .eq('id', stepId)
    .single();

  const completedAt = new Date();
  const startedAt = step?.started_at ? new Date(step.started_at) : completedAt;
  const durationMs = completedAt.getTime() - startedAt.getTime();

  const { error } = await supabase
    .from('execution_steps')
    .update({
      status,
      output,
      completed_at: completedAt.toISOString(),
      duration_ms: durationMs,
      error_message: errorMessage || null,
    })
    .eq('id', stepId);

  if (error) {
    console.error('Error completing step:', error);
    throw error;
  }
}

// Get executions for a workflow
export async function getExecutions(
  userId: string,
  workflowId?: string,
  limit: number = 50
): Promise<WorkflowExecution[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('workflow_executions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (workflowId) {
    query = query.eq('workflow_id', workflowId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching executions:', error);
    throw error;
  }

  return data || [];
}

// Get execution details with steps
export async function getExecutionDetails(
  executionId: string,
  userId: string
): Promise<{ execution: WorkflowExecution; steps: ExecutionStep[] } | null> {
  const supabase = getSupabaseClient();
  
  // Get execution
  const { data: execution, error: execError } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('id', executionId)
    .eq('user_id', userId)
    .single();

  if (execError || !execution) {
    return null;
  }

  // Get steps
  const { data: steps, error: stepsError } = await supabase
    .from('execution_steps')
    .select('*')
    .eq('execution_id', executionId)
    .order('created_at', { ascending: true });

  if (stepsError) {
    console.error('Error fetching steps:', stepsError);
    return { execution, steps: [] };
  }

  return { execution, steps: steps || [] };
}

// Delete old executions (for retention policy)
export async function cleanupOldExecutions(
  userId: string,
  retentionDays: number
): Promise<number> {
  const supabase = getSupabaseClient();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const { data, error } = await supabase
    .from('workflow_executions')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error('Error cleaning up executions:', error);
    throw error;
  }

  return data?.length || 0;
}







