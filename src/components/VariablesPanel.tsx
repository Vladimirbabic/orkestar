'use client';

import { useState } from 'react';
import { Variable, Plus, Trash2, X, Braces, Info } from 'lucide-react';

export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  defaultValue: string;
  description?: string;
  required?: boolean;
}

interface VariablesPanelProps {
  variables: WorkflowVariable[];
  onChange: (variables: WorkflowVariable[]) => void;
  onClose: () => void;
}

export function VariablesPanel({ variables, onChange, onClose }: VariablesPanelProps) {
  const [newVarName, setNewVarName] = useState('');

  const addVariable = () => {
    if (!newVarName.trim()) return;
    
    const id = `var_${Date.now()}`;
    const newVar: WorkflowVariable = {
      id,
      name: newVarName.trim().replace(/\s+/g, '_'),
      type: 'string',
      defaultValue: '',
      required: false,
    };
    
    onChange([...variables, newVar]);
    setNewVarName('');
  };

  const updateVariable = (id: string, updates: Partial<WorkflowVariable>) => {
    onChange(
      variables.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const deleteVariable = (id: string) => {
    onChange(variables.filter((v) => v.id !== id));
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Braces className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Variables</h2>
            <p className="text-xs text-zinc-500">Dynamic inputs for your workflow</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Info */}
      <div className="p-4 bg-zinc-800/30 border-b border-zinc-800">
        <div className="flex gap-3">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-400">
            <p>Use variables in prompts with the syntax:</p>
            <code className="mt-1 block px-2 py-1 bg-zinc-800 rounded text-violet-400 font-mono">
              {'{{variable_name}}'}
            </code>
          </div>
        </div>
      </div>

      {/* Add New Variable */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newVarName}
            onChange={(e) => setNewVarName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addVariable()}
            placeholder="Variable name..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
          <button
            onClick={addVariable}
            disabled={!newVarName.trim()}
            className="px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Variables List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {variables.length === 0 ? (
          <div className="text-center py-8">
            <Variable className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No variables defined</p>
            <p className="text-xs text-zinc-600 mt-1">
              Add variables to make your workflow dynamic
            </p>
          </div>
        ) : (
          variables.map((variable) => (
            <div
              key={variable.id}
              className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <code className="text-sm font-mono text-violet-400">
                    {'{{' + variable.name + '}}'}
                  </code>
                </div>
                <button
                  onClick={() => deleteVariable(variable.id)}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Type */}
                <div>
                  <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    Type
                  </label>
                  <select
                    value={variable.type}
                    onChange={(e) =>
                      updateVariable(variable.id, {
                        type: e.target.value as WorkflowVariable['type'],
                      })
                    }
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="json">JSON</option>
                  </select>
                </div>

                {/* Default Value */}
                <div>
                  <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={variable.defaultValue}
                    onChange={(e) =>
                      updateVariable(variable.id, { defaultValue: e.target.value })
                    }
                    placeholder="Optional default..."
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    Description
                  </label>
                  <input
                    type="text"
                    value={variable.description || ''}
                    onChange={(e) =>
                      updateVariable(variable.id, { description: e.target.value })
                    }
                    placeholder="What is this variable for?"
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>

                {/* Required */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={variable.required || false}
                    onChange={(e) =>
                      updateVariable(variable.id, { required: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500/50"
                  />
                  <span className="text-xs text-zinc-400">Required</span>
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="text-xs text-zinc-500">
          <p>Variables are replaced when the workflow runs.</p>
          <p className="mt-1">
            Webhook triggers automatically populate variables from the request body.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VariablesPanel;

