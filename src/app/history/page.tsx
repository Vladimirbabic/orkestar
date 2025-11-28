'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { getCurrentUserIdSync } from '@/lib/supabase';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Webhook,
  Calendar,
  ChevronRight,
  Search,
  Filter,
  Crown,
} from 'lucide-react';
import { WorkflowExecution, ExecutionStep } from '@/lib/executionService';

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isPro } = useSubscription();
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<{
    execution: WorkflowExecution;
    steps: ExecutionStep[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed' | 'running'>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchExecutions() {
      try {
        const userId = getCurrentUserIdSync();
        const res = await fetch('/api/executions', {
          headers: { 'x-user-id': userId || '' },
        });
        const data = await res.json();
        setExecutions(data.executions || []);
      } catch (error) {
        console.error('Error fetching executions:', error);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchExecutions();
    }
  }, [isAuthenticated]);

  const loadExecutionDetails = async (executionId: string) => {
    try {
      const userId = getCurrentUserIdSync();
      const res = await fetch(`/api/executions/${executionId}`, {
        headers: { 'x-user-id': userId || '' },
      });
      const data = await res.json();
      setSelectedExecution(data);
    } catch (error) {
      console.error('Error fetching execution details:', error);
    }
  };

  const filteredExecutions = executions.filter((e) => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    return true;
  });

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'webhook':
        return <Webhook className="w-4 h-4 text-amber-500" />;
      case 'schedule':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      default:
        return <Play className="w-4 h-4 text-emerald-500" />;
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Workflows</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Clock className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Execution History</h1>
              <p className="text-sm text-zinc-500">
                {isPro() ? '30-day retention' : '24-hour retention • Upgrade for more'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {(['all', 'completed', 'failed', 'running'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Executions List */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-medium text-zinc-200">Recent Runs</h3>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-zinc-500">Loading...</div>
              ) : filteredExecutions.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">No executions yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Run a workflow to see history here</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {filteredExecutions.map((execution) => (
                    <button
                      key={execution.id}
                      onClick={() => loadExecutionDetails(execution.id)}
                      className={`w-full p-4 text-left hover:bg-zinc-800/50 transition-colors ${
                        selectedExecution?.execution.id === execution.id ? 'bg-zinc-800/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(execution.status)}
                          <span className="text-sm font-medium text-zinc-200">
                            {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        {getTriggerIcon(execution.trigger_type)}
                        <span>{execution.trigger_type}</span>
                        <span>•</span>
                        <span>{formatDuration(execution.total_duration_ms)}</span>
                      </div>
                      <div className="text-xs text-zinc-600 mt-1">
                        {formatDate(execution.started_at)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Execution Details */}
          <div className="lg:col-span-2">
            {selectedExecution ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(selectedExecution.execution.status)}
                      <div>
                        <h3 className="font-medium text-zinc-200">
                          Execution Details
                        </h3>
                        <p className="text-xs text-zinc-500">
                          {formatDate(selectedExecution.execution.started_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400">
                      Duration: {formatDuration(selectedExecution.execution.total_duration_ms)}
                    </div>
                  </div>
                </div>

                {/* Error message */}
                {selectedExecution.execution.error_message && (
                  <div className="p-4 bg-red-500/10 border-b border-red-500/20">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Error</p>
                        <p className="text-sm text-red-300/80 mt-1">
                          {selectedExecution.execution.error_message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Steps */}
                <div className="p-4">
                  <h4 className="text-sm font-medium text-zinc-400 mb-4">Steps</h4>
                  {selectedExecution.steps.length === 0 ? (
                    <p className="text-sm text-zinc-500">No step details recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedExecution.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">#{index + 1}</span>
                              {getStatusIcon(step.status)}
                              <span className="text-sm font-medium text-zinc-200">
                                {step.node_label || step.node_type}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-500">
                              {formatDuration(step.duration_ms)}
                            </span>
                          </div>

                          {/* Input/Output */}
                          <div className="mt-3 space-y-2">
                            {step.input && (
                              <details className="group">
                                <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                                  Input
                                </summary>
                                <pre className="mt-2 p-2 bg-zinc-900 rounded text-xs text-zinc-400 overflow-auto max-h-32">
                                  {JSON.stringify(step.input, null, 2)}
                                </pre>
                              </details>
                            )}
                            {step.output && (
                              <details className="group">
                                <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                                  Output
                                </summary>
                                <pre className="mt-2 p-2 bg-zinc-900 rounded text-xs text-zinc-400 overflow-auto max-h-32">
                                  {JSON.stringify(step.output, null, 2)}
                                </pre>
                              </details>
                            )}
                            {step.error_message && (
                              <div className="mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                                <p className="text-xs text-red-400">{step.error_message}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-200 mb-2">
                  Select an execution
                </h3>
                <p className="text-zinc-500">
                  Click on a run from the list to view its details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pro CTA */}
        {!isPro() && (
          <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Crown className="w-8 h-8 text-violet-400" />
                <div>
                  <h3 className="font-semibold text-white">Extended History with Pro</h3>
                  <p className="text-sm text-zinc-400">
                    Get 30-day retention, detailed step logs, and error tracing
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-600 transition-colors"
              >
                Upgrade
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

