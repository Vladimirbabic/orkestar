'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listContexts, deleteContext, saveContext, type Context } from '@/lib/contextService';
import { Plus, FileText, Trash2, Edit, Calendar, X, Save, Settings } from 'lucide-react';

export default function ContextsPage() {
  const router = useRouter();
  const [contexts, setContexts] = useState<Context[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingContext, setEditingContext] = useState<Context | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    system_prompt: '',
    temperature: 0.7,
  });

  useEffect(() => {
    loadContexts();
  }, []);

  const loadContexts = async () => {
    try {
      setIsLoading(true);
      const list = await listContexts();
      setContexts(list);
    } catch (error) {
      console.error('Failed to load contexts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateContext = () => {
    setEditingContext(null);
    setFormData({
      name: '',
      content: '',
      system_prompt: '',
      temperature: 0.7,
    });
    setIsModalOpen(true);
  };

  const handleEditContext = (context: Context) => {
    setEditingContext(context);
    setFormData({
      name: context.name,
      content: context.content,
      system_prompt: context.system_prompt || '',
      temperature: context.temperature ?? 0.7,
    });
    setIsModalOpen(true);
  };

  const handleSaveContext = async () => {
    if (!formData.name.trim()) {
      alert('Context name is required');
      return;
    }

    if (!formData.content.trim()) {
      alert('Context content is required');
      return;
    }

    try {
      await saveContext(
        formData.name,
        formData.content,
        formData.system_prompt || undefined,
        formData.temperature,
        editingContext?.id
      );
      setIsModalOpen(false);
      loadContexts();
    } catch (error) {
      console.error('Failed to save context:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save context';
      alert(`Failed to save context: ${errorMessage}`);
    }
  };

  const handleDeleteContext = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this context?')) return;

    try {
      setDeletingId(id);
      await deleteContext(id);
      setContexts(contexts.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete context:', error);
      alert('Failed to delete context');
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
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <FileText className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-100">Contexts</h1>
                <p className="text-sm text-zinc-500">Manage context templates for your workflows</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                Workflows
              </button>
              <button
                onClick={handleCreateContext}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Context
              </button>
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
              <p className="text-zinc-500 text-sm">Loading contexts...</p>
            </div>
          </div>
        ) : contexts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-200 mb-2">No contexts yet</h3>
            <p className="text-sm text-zinc-500 mb-6 text-center max-w-md">
              Create context templates to define rules and settings for your AI models
            </p>
            <button
              onClick={handleCreateContext}
              className="px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Context
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contexts.map((context) => (
              <div
                key={context.id}
                className="group relative p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-zinc-900/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-zinc-100 mb-1 truncate">
                      {context.name}
                    </h3>
                    <p className="text-sm text-zinc-500 line-clamp-3">{context.content}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleEditContext(context)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-all"
                      title="Edit context"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteContext(context.id, e)}
                      disabled={deletingId === context.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-all"
                      title="Delete context"
                    >
                      {deletingId === context.id ? (
                        <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {(context.system_prompt || context.temperature !== null) && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Settings className="w-3.5 h-3.5" />
                      {context.system_prompt && (
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
                          System Prompt
                        </span>
                      )}
                      {context.temperature !== null && context.temperature !== undefined && (
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
                          Temp: {context.temperature.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-zinc-500 mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Updated {formatDate(context.updated_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">
                    {editingContext ? 'Edit Context' : 'New Context'}
                  </h2>
                  <p className="text-xs text-zinc-500">Define context and settings</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Support Rules"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your context here... This will be used to provide background information or rules for AI models."
                  rows={8}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent"
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  System Prompt (Optional)
                </label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="Optional system prompt that will be applied to AI models using this context..."
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent"
                />
              </div>

              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-400">Temperature</label>
                  <span className="text-xs text-zinc-500">{formData.temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContext}
                className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

