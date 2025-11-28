'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listWorkflows, deleteWorkflow, type Workflow } from '@/lib/workflowService';
import { useAuth } from '@/context/AuthContext';
import { useSettingsStore } from '@/store/settingsStore';
import SettingsModal from '@/components/SettingsModal';
import { Plus, Workflow as WorkflowIcon, Trash2, Calendar, FileText, LogOut, User, Key, Crown, LayoutTemplate, Clock } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { UsageIndicator } from '@/components/UsageIndicator';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { PRICING_TIERS } from '@/lib/stripe';

export default function WorkflowsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { openSettings, getEnabledModels } = useSettingsStore();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const enabledModelsCount = getEnabledModels().length;
  const { status: subscriptionStatus, canCreateWorkflow } = useSubscription();

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const list = await listWorkflows();
      setWorkflows(list);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflow = () => {
    if (!canCreateWorkflow()) {
      setShowUpgradePrompt(true);
      return;
    }
    router.push('/workflows/new');
  };

  const handleEditWorkflow = (id: string) => {
    router.push(`/workflows/${id}`);
  };

  const handleDeleteWorkflow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      setDeletingId(id);
      await deleteWorkflow(id);
      setWorkflows(workflows.filter((w) => w.id !== id));
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      alert('Failed to delete workflow');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Settings Modal */}
      <SettingsModal />
      
      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt 
          feature="workflows" 
          onClose={() => setShowUpgradePrompt(false)} 
        />
      )}
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <WorkflowIcon className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-100">Workflows</h1>
                <p className="text-sm text-zinc-500">Manage your AI workflow automations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/templates')}
                className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <LayoutTemplate className="w-4 h-4" />
                Templates
              </button>
              <button
                onClick={() => router.push('/history')}
                className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                History
              </button>
              <button
                onClick={() => router.push('/contexts')}
                className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Contexts
              </button>
              <button
                onClick={handleCreateWorkflow}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Workflow
              </button>
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm max-w-[120px] truncate">{user?.email}</span>
                </button>
                
                {isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsUserMenuOpen(false)} 
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
                      <div className="px-3 py-2 border-b border-zinc-700">
                        <p className="text-xs text-zinc-500">Signed in as</p>
                        <p className="text-sm text-zinc-200 truncate">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          openSettings();
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          API Keys
                        </span>
                        <span className="text-xs text-zinc-500">{enabledModelsCount} configured</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          router.push('/pricing');
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Crown className="w-4 h-4" />
                          {subscriptionStatus?.tier === 'free' ? 'Upgrade' : 'Subscription'}
                        </span>
                        <span className={`text-xs ${subscriptionStatus?.tier === 'pro' ? 'text-violet-400' : 'text-zinc-500'}`}>
                          {PRICING_TIERS[subscriptionStatus?.tier || 'free'].name}
                        </span>
                      </button>
                      <div className="border-t border-zinc-700 mt-1 pt-1">
                        <button
                          onClick={async () => {
                            await signOut();
                            router.push('/login');
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-zinc-800 animate-pulse" />
              <p className="text-zinc-500 text-sm">Loading workflows...</p>
            </div>
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <WorkflowIcon className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-200 mb-2">No workflows yet</h3>
            <p className="text-sm text-zinc-500 mb-6 text-center max-w-md">
              Create your first workflow to start building AI automation chains
            </p>
            <button
              onClick={handleCreateWorkflow}
              className="px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                onClick={() => handleEditWorkflow(workflow.id)}
                className="group relative p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:shadow-lg hover:shadow-zinc-900/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-zinc-100 mb-1 truncate">
                      {workflow.name}
                    </h3>
                    {workflow.description && (
                      <p className="text-sm text-zinc-500 line-clamp-2">{workflow.description}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteWorkflow(workflow.id, e)}
                    disabled={deletingId === workflow.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-all ml-2"
                    title="Delete workflow"
                  >
                    {deletingId === workflow.id ? (
                      <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500 mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Updated {formatDate(workflow.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <WorkflowIcon className="w-3.5 h-3.5" />
                    <span>{workflow.nodes?.length || 0} nodes</span>
                  </div>
                </div>

                <div className="absolute inset-0 rounded-xl bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
