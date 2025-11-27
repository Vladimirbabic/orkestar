'use client';

import { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import { useSettingsStore } from '@/store/settingsStore';
import { AIModel } from '@/store/workflowStore';
import { getDefaultSubModel, getSubModelLabel } from '@/lib/modelConfig';

interface WorkflowStep {
  type: 'ai' | 'result';
  model?: AIModel;
  prompt?: string;
  systemPrompt?: string;
  temperature?: number;
}

export default function AIWorkflowBuilder() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { addNode, addResultNode } = useWorkflowStore();
  const { apiKeys, hasApiKey } = useSettingsStore();

  const handleGenerate = async () => {
    if (!input.trim() || !hasApiKey('openai')) {
      alert('Please enter a workflow description and ensure OpenAI API key is configured');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai',
          subModel: 'gpt-4-turbo',
          prompt: `You are a workflow builder assistant. Analyze the following request and generate a workflow structure in JSON format.

Request: "${input}"

Return ONLY a valid JSON array of workflow steps. Each step should be an object with:
- type: "ai" or "result"
- model: one of "openai", "gemini", "stable-diffusion", "elevenlabs", "custom", "supadata" (only for type "ai")
- prompt: the prompt for this step (for type "ai")
- systemPrompt: optional system prompt (for type "ai")
- temperature: optional temperature 0-1 (for type "ai")

Examples:
- For "create workflow for generating image": [{"type":"ai","model":"gemini","subModel":"gemini-2.5-flash-image","prompt":"Generate a beautiful landscape image"},{"type":"result"}]

Return ONLY the JSON array, no other text.`,
          apiKey: apiKeys.openai,
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workflow');
      }

      // Parse the AI response
      let steps: WorkflowStep[];
      try {
        // Try to extract JSON from the response
        const jsonMatch = data.result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          steps = JSON.parse(jsonMatch[0]);
        } else {
          steps = JSON.parse(data.result);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', data.result);
        throw new Error('Failed to parse workflow structure. Please try rephrasing your request.');
      }

      // Get current node count to track new nodes
      const initialNodeCount = useWorkflowStore.getState().nodes.length;
      
      // Create nodes based on the steps
      const startX = 400;
      const startY = 300;
      const spacingX = 400;

      steps.forEach((step, i) => {
        const position = {
          x: startX + i * spacingX,
          y: startY,
        };

        if (step.type === 'result') {
          addResultNode(position);
        } else if (step.type === 'ai' && step.model) {
          addNode(step.model, position);
        }
      });

      // Wait for React state to update, then update node data and connect
      setTimeout(() => {
        const store = useWorkflowStore.getState();
        const currentNodes = store.nodes;
        const newNodes = currentNodes.slice(initialNodeCount);
        const createdNodeIds: string[] = [];
        
        // Update node data for AI nodes and collect IDs
        newNodes.forEach((node, index) => {
          const step = steps[index];
          createdNodeIds.push(node.id);
          
          if (step && step.type === 'ai' && step.model) {
            store.updateNodeData(node.id, {
              prompt: step.prompt || '',
              systemPrompt: step.systemPrompt,
              temperature: step.temperature ?? 0.7,
              label: getSubModelLabel(step.model, getDefaultSubModel(step.model)),
            });
          }
        });

        // Connect nodes sequentially
        for (let i = 0; i < createdNodeIds.length - 1; i++) {
          store.onConnect({
            source: createdNodeIds[i],
            target: createdNodeIds[i + 1],
            sourceHandle: null,
            targetHandle: null,
          });
        }
      }, 150);

      setInput('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to generate workflow:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate workflow');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-4 z-40 p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all backdrop-blur-sm shadow-lg"
        title="AI Workflow Builder"
      >
        <Sparkles className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed top-20 right-4 z-40 w-80 bg-zinc-900/95 border border-zinc-800 rounded-lg shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-zinc-200">AI Workflow Builder</span>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setInput('');
          }}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleGenerate();
            }
          }}
          placeholder="Describe your workflow...&#10;e.g., 'create workflow for generating image'"
          rows={3}
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          disabled={isGenerating}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !input.trim() || !hasApiKey('openai')}
          className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Workflow
            </>
          )}
        </button>
        {!hasApiKey('openai') && (
          <p className="text-xs text-zinc-500 text-center">
            OpenAI API key required
          </p>
        )}
      </div>
    </div>
  );
}

