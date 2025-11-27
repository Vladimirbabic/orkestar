'use client';

import { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorkflowRunnerContext } from '@/context/WorkflowRunnerContext';
import { useWorkflowStore } from '@/store/workflowStore';
import { saveWorkflow, listWorkflows, loadWorkflow } from '@/lib/workflowService';
import {
  Play,
  Save,
  Download,
  Upload,
  Undo2,
  Redo2,
  Settings,
  HelpCircle,
  ChevronDown,
  Key,
  Loader2,
  FolderOpen,
  CheckCircle2,
  X,
  ArrowLeft,
} from 'lucide-react';

export default function Toolbar() {
  const { nodes, edges, currentWorkflowName, currentWorkflowId, setWorkflowName, loadWorkflow: loadWorkflowToStore } = useWorkflowStore();
  const { openSettings, getEnabledModels } = useSettingsStore();
  const { runWorkflow, isRunning } = useWorkflowRunnerContext();
  const [isSaving, setIsSaving] = useState(false);
  const [isWorkflowDropdownOpen, setIsWorkflowDropdownOpen] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [enabledCount, setEnabledCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const workflowDropdownRef = useRef<HTMLDivElement>(null);
  
  // Update enabled count after hydration to avoid SSR mismatch
  useEffect(() => {
    setIsMounted(true);
    const updateCount = () => {
      setEnabledCount(getEnabledModels().length);
    };
    updateCount();
    
    // Subscribe to store changes to update count when keys change
    const unsubscribe = useSettingsStore.subscribe(
      (state) => state.apiKeys,
      updateCount
    );
    
    return () => unsubscribe();
  }, [getEnabledModels]);

  // Load workflows when dropdown opens
  useEffect(() => {
    if (isWorkflowDropdownOpen) {
      loadWorkflows();
    }
  }, [isWorkflowDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isWorkflowDropdownOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (workflowDropdownRef.current && !workflowDropdownRef.current.contains(event.target as Node)) {
        setIsWorkflowDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isWorkflowDropdownOpen]);

  const loadWorkflows = async () => {
    try {
      const list = await listWorkflows();
      setWorkflows(list);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  // Cleanup save status timeouts
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timeoutId = setTimeout(() => setSaveStatus(null), 2000);
      return () => clearTimeout(timeoutId);
    } else if (saveStatus === 'error') {
      const timeoutId = setTimeout(() => setSaveStatus(null), 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [saveStatus]);

  const handleSaveWorkflow = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const workflow = await saveWorkflow(
        currentWorkflowName,
        nodes,
        edges,
        undefined,
        currentWorkflowId || undefined
      );
      setSaveStatus('saved');
      useWorkflowStore.setState({ currentWorkflowId: workflow.id });
    } catch (error) {
      console.error('Failed to save workflow:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadWorkflow = async (workflowId: string) => {
    try {
      const workflow = await loadWorkflow(workflowId);
      if (workflow) {
        loadWorkflowToStore(workflow.nodes, workflow.edges);
        setWorkflowName(workflow.name);
        useWorkflowStore.setState({ currentWorkflowId: workflow.id });
        setIsWorkflowDropdownOpen(false);
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
    }
  };

  const handleRunWorkflow = async () => {
    if (isRunning) return;
    await runWorkflow();
  };

  return (
    <div className="h-12 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4">
      {/* Left section - Back button and Workflow name */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.location.href = '/'}
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Back to Workflows"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-zinc-800" />
        <div className="flex items-center gap-4">
        <div ref={workflowDropdownRef} className="relative flex items-center gap-2">
          <input
            type="text"
            value={currentWorkflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent text-zinc-100 font-medium text-sm focus:outline-none border-b border-transparent hover:border-zinc-700 focus:border-zinc-600 transition-colors px-1 py-0.5"
          />
          <button 
            onClick={() => setIsWorkflowDropdownOpen(!isWorkflowDropdownOpen)}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isWorkflowDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Workflow Dropdown */}
          {isWorkflowDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
              <div className="p-2 border-b border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-200">Workflows</span>
                  <button
                    onClick={loadWorkflows}
                    className="p-1 rounded hover:bg-zinc-700 text-zinc-400"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-1">
                {workflows.length === 0 ? (
                  <div className="p-3 text-sm text-zinc-500 text-center">No workflows saved</div>
                ) : (
                  workflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => handleLoadWorkflow(workflow.id)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-zinc-700 transition-colors"
                    >
                      <div className="text-sm text-zinc-200 font-medium">{workflow.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {new Date(workflow.updated_at).toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500">Saved</span>
            </>
          )}
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
              <span className="text-yellow-500">Saving...</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <X className="w-3 h-3 text-red-500" />
              <span className="text-red-500">Error</span>
            </>
          )}
          {!saveStatus && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <span>Unsaved</span>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Center section - Tools */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 px-2">
          <button className="p-2 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Undo2 className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-zinc-800" />

        <div className="flex items-center gap-0.5 px-2">
          <button className="p-2 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Upload className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        <button 
          onClick={openSettings}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
        >
          <Key className="w-4 h-4" />
          <span className="text-xs" suppressHydrationWarning>{enabledCount} keys</span>
        </button>
        <button 
          onClick={handleSaveWorkflow}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </button>
        <button 
          onClick={handleRunWorkflow}
          disabled={isRunning}
          className={`
            flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors
            ${isRunning 
              ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed' 
              : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
            }
          `}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Workflow
            </>
          )}
        </button>
        <div className="w-px h-5 bg-zinc-800" />
        <button className="p-2 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
