'use client';

import { memo, useMemo, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileOutput, Copy, Download, Check, Loader2, ArrowRight, Files, Play, Pause } from 'lucide-react';
import { useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';

export interface ResultNodeData {
  label: string;
  result?: string;
  isLoading?: boolean;
  timestamp?: string;
}

const ResultNode = ({ data, selected, id, ...props }: NodeProps) => {
  const nodeData = data as unknown as ResultNodeData;
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);

  // Extract only the actual response content, removing metadata
  const extractResponseContent = (result: string): string => {
    if (!result) return '';
    
    const trimmed = result.trim();
    const base64Only = trimmed.replace(/\s/g, '');
    
    // First, check if it's raw base64 data (long alphanumeric string, may have whitespace)
    // Base64 typically contains A-Z, a-z, 0-9, +, /, = characters
    // Check if it's mostly base64 characters and long enough to be image data (at least 100 chars, typically much more)
    if (base64Only.length > 100 && /^[A-Za-z0-9+/=]+$/.test(base64Only)) {
      // Likely base64 image data, convert to data URL
      // Try to detect image type from context or default to png
      return `data:image/png;base64,${base64Only}`;
    }
    
    // Check for markdown image with base64 data: ![alt](data:image/...;base64,...)
    // Handle both with and without whitespace in base64
    const markdownImageMatch = trimmed.match(/!\[.*?\]\(data:(image\/[^;]+);base64,([^)]+)\)/);
    if (markdownImageMatch) {
      const mimeType = markdownImageMatch[1];
      const base64Data = markdownImageMatch[2].replace(/\s/g, ''); // Remove any whitespace
      return `data:${mimeType};base64,${base64Data}`;
    }
    
    // Also check for data URL that might be embedded in text
    const embeddedDataUrlMatch = trimmed.match(/data:(image\/[^;]+);base64,([^\s\)]+)/);
    if (embeddedDataUrlMatch) {
      const mimeType = embeddedDataUrlMatch[1];
      const base64Data = embeddedDataUrlMatch[2].replace(/\s/g, '');
      return `data:${mimeType};base64,${base64Data}`;
    }
    
    // If it's an audio data URL, return as-is
    if (result.startsWith('data:audio/')) {
      return result;
    }
    
    // If it's an image URL, return as-is
    if (result.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i) || 
        result.startsWith('data:image/') ||
        result.match(/^https?:\/\/.*\.(blob|azure|s3|cloudfront)/i)) {
      return result;
    }
    
    // If it looks like clean text (not JSON), return as-is
    // Check if it starts with a quote or brace (likely JSON) vs normal text
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.endsWith('}') || trimmed.endsWith(']')) {
      // Looks like JSON, try to parse
    } else if (trimmed.length > 0 && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      // Looks like plain text, return as-is (but check for common issues)
      // If it contains a lot of mixed characters that look like corrupted JSON, try parsing anyway
      if (trimmed.includes('"id"') || trimmed.includes('"object"') || trimmed.includes('"output"')) {
        // Might be JSON without proper formatting, try parsing
      } else {
        // Clean text, return as-is
        return result;
      }
    }
    
    // Try to parse as JSON to extract meaningful content
    try {
      const parsed = JSON.parse(result);
      
      // Recursive function to find text content in nested structures
      const findTextContent = (obj: any, depth = 0): string | null => {
        // Prevent infinite recursion
        if (depth > 10 || obj === null || obj === undefined) return null;
        
        // If it's a string and looks like actual content (not an ID or URL), return it
        if (typeof obj === 'string') {
          // Skip IDs, URLs (unless image), and very short strings that look like metadata
          if (obj.match(/^(resp_|msg_|req_|id_|chatcmpl-)/i)) return null;
          if (obj.length < 3) return null;
          
          // Check if it looks like corrupted or mixed content
          // If it has too many special characters or mixed languages in a weird way, skip it
          const specialCharRatio = (obj.match(/[^a-zA-Z0-9\s.,!?;:'"()-]/g) || []).length / obj.length;
          if (specialCharRatio > 0.3 && obj.length < 500) return null; // Too many special chars for short text
          
          // Check if it looks like actual readable content
          // Should have reasonable word-like patterns
          const wordPattern = /\b[a-zA-Z]{2,}\b/g;
          const wordMatches = obj.match(wordPattern);
          if (!wordMatches || wordMatches.length < 3) {
            // Not enough words, might be metadata or corrupted
            if (obj.length < 100) return null;
          }
          
          // If it's a long string or contains actual text (not just metadata), return it
          if (obj.length > 20 || /[a-zA-Z]{3,}/.test(obj)) {
            return obj;
          }
          return null;
        }
        
        // If it's an array, check each item
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const found = findTextContent(item, depth + 1);
            if (found) return found;
          }
          return null;
        }
        
        // If it's an object, check specific fields in priority order
        if (typeof obj === 'object') {
          // Priority 1: Direct text fields (most common) - return FIRST valid one only
          const textFields = ['text', 'content', 'message', 'transcript', 'output_text'];
          for (const field of textFields) {
            if (obj[field] && typeof obj[field] === 'string' && obj[field].length > 10) {
              const text = obj[field];
              // Validate it looks like actual content, not metadata
              if (!text.match(/^(resp_|msg_|req_|id_|chatcmpl-)/i)) {
                return text;
              }
            }
          }
          
          // Priority 2: Nested content arrays (like OpenAI Responses API) - return FIRST valid one only
          if (obj.content && Array.isArray(obj.content)) {
            for (const contentItem of obj.content) {
              // Check for output_text type specifically (highest priority for GPT-5.1)
              if (contentItem.type === 'output_text' && contentItem.text && typeof contentItem.text === 'string' && contentItem.text.length > 10) {
                const text = contentItem.text;
                // Validate it looks like actual content
                if (!text.match(/^(resp_|msg_|req_|id_|chatcmpl-)/i)) {
                  return text;
                }
              }
              // Check for direct text field
              if (contentItem.text && typeof contentItem.text === 'string' && contentItem.text.length > 10) {
                const text = contentItem.text;
                if (!text.match(/^(resp_|msg_|req_|id_|chatcmpl-)/i)) {
                  return text;
                }
              }
              // Check if contentItem itself is a string
              if (typeof contentItem === 'string' && contentItem.length > 10) {
                if (!contentItem.match(/^(resp_|msg_|req_|id_|chatcmpl-)/i)) {
                  return contentItem;
                }
              }
            }
          }
          
          // Priority 3: Output array (like OpenAI Responses API) - most important for GPT-5.1
          // Return FIRST valid text only, don't concatenate
          if (obj.output && Array.isArray(obj.output)) {
            for (const outputItem of obj.output) {
              // First check if outputItem has content array
              if (outputItem.content && Array.isArray(outputItem.content)) {
                for (const contentItem of outputItem.content) {
                  // Highest priority: output_text type
                  if (contentItem.type === 'output_text' && contentItem.text && typeof contentItem.text === 'string' && contentItem.text.length > 10) {
                    const text = contentItem.text;
                    if (!text.match(/^(resp_|msg_|req_|id_|chatcmpl-)/i)) {
                      return text; // Return first valid text, don't continue
                    }
                  }
                  // Check for direct text field
                  if (contentItem.text && typeof contentItem.text === 'string' && contentItem.text.length > 10) {
                    const text = contentItem.text;
                    if (!text.match(/^(resp_|msg_|req_|id_|chatcmpl-)/i)) {
                      return text; // Return first valid text, don't continue
                    }
                  }
                }
              }
              // Then recursively check the outputItem (but only return first valid result)
              const found = findTextContent(outputItem, depth + 1);
              if (found) return found; // Return first valid, don't continue
            }
          }
          
          // Priority 4: Other common fields
          const otherFields = ['data', 'result', 'response', 'body'];
          for (const field of otherFields) {
            const found = findTextContent(obj[field], depth + 1);
            if (found) return found;
          }
          
          // Priority 5: Recursively check all object values
          for (const key in obj) {
            // Skip metadata fields
            if (['id', 'object', 'created_at', 'status', 'error', 'usage', 'model', 'billing', 
                 'metadata', 'user', 'service_tier', 'temperature', 'tools', 'tool_choice'].includes(key)) {
              continue;
            }
            const found = findTextContent(obj[key], depth + 1);
            if (found) return found;
          }
        }
        
        return null;
      };
      
      const extracted = findTextContent(parsed);
      if (extracted) {
        // Check if extracted content is base64 image data
        const base64Only = extracted.replace(/\s/g, '');
        if (base64Only.length > 500 && /^[A-Za-z0-9+/=]+$/.test(base64Only)) {
          // Convert to data URL
          return `data:image/png;base64,${base64Only}`;
        }
        // Check for markdown image format
        const markdownImageMatch = extracted.match(/!\[.*?\]\(data:(image\/[^;]+);base64,([^)]+)\)/);
        if (markdownImageMatch) {
          const mimeType = markdownImageMatch[1];
          const base64Data = markdownImageMatch[2].replace(/\s/g, '');
          return `data:${mimeType};base64,${base64Data}`;
        }
        
        // Validate extracted text - filter out corrupted/mixed content
        // Check for excessive special characters or mixed languages in a weird way
        const specialCharCount = (extracted.match(/[^a-zA-Z0-9\s.,!?;:'"()-]/g) || []).length;
        const specialCharRatio = specialCharCount / extracted.length;
        
        // If it has too many special characters relative to length, it might be corrupted
        if (specialCharRatio > 0.4 && extracted.length < 1000) {
          // Try to find a cleaner substring
          // Look for the longest sequence of readable text
          const cleanMatch = extracted.match(/[a-zA-Z\s.,!?;:'"()-]{50,}/);
          if (cleanMatch) {
            return cleanMatch[0].trim();
          }
        }
        
        return extracted;
      }
    } catch {
      // Not JSON, continue with original string
    }
    
    // Return original if not JSON or no content field found
    return result;
  };

  // Memoize expensive extraction
  const displayResult = useMemo(
    () => nodeData.result ? extractResponseContent(nodeData.result) : '',
    [nodeData.result]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    if (copied) {
      const timeoutId = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [copied]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayResult) {
      await navigator.clipboard.writeText(displayResult);
      setCopied(true);
    }
  }, [displayResult]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayResult) {
      // Handle audio data URLs
      if (displayResult.startsWith('data:audio/')) {
        const a = document.createElement('a');
        a.href = displayResult;
        a.download = `audio-${Date.now()}.mp3`;
        a.click();
        return;
      }
      
      // Handle image data URLs
      if (displayResult.startsWith('data:image/')) {
        const a = document.createElement('a');
        a.href = displayResult;
        a.download = `image-${Date.now()}.png`;
        a.click();
        return;
      }
      
      // Handle text
      const blob = new Blob([displayResult], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `result-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [displayResult]);

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Reset playing state when audio ends
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, [displayResult]);

  return (
    <div
      className={`
        group relative w-[320px] rounded-xl
        border-2
        transition-all duration-150
        border-zinc-700 hover:border-zinc-600 bg-zinc-900
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10">
            <FileOutput className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-200">{nodeData.label || 'Result'}</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Output / Pass-through</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(id);
            }}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Duplicate node"
          >
            <Files className="w-3.5 h-3.5" />
          </button>
          {displayResult && (
            <>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={handleDownload}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Download as file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Result Content */}
      <div className="px-3 py-3 min-h-[100px] max-h-[200px] overflow-y-auto">
        {nodeData.isLoading ? (
          <div className="flex items-center justify-center h-[80px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              <span className="text-xs text-zinc-500">Processing...</span>
            </div>
          </div>
        ) : displayResult ? (
          <div className="space-y-2">
            {/* Check if result is an audio data URL */}
            {displayResult.startsWith('data:audio/') ? (
              <div className="space-y-2" style={{ contain: 'content' }}>
                <audio 
                  ref={audioRef}
                  src={displayResult.trim()} 
                  className="hidden"
                  preload="metadata"
                />
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                  <button
                    onClick={handlePlayPause}
                    className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-200">Audio Generated</p>
                    <p className="text-xs text-zinc-500">{isPlaying ? 'Playing...' : 'Click to play'}</p>
                  </div>
                </div>
                <a 
                  href={displayResult.trim()} 
                  download="audio.mp3"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Download audio
                </a>
              </div>
            ) : displayResult.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i) || 
             displayResult.startsWith('data:image/') ||
             displayResult.match(/^https?:\/\/.*\.(blob|azure|s3|cloudfront)/i) ? (
              <div className="space-y-2" style={{ contain: 'content' }}>
                <img 
                  src={displayResult.trim()} 
                  alt="Generated image" 
                  loading="lazy"
                  decoding="async"
                  className="w-full rounded-lg border border-zinc-800 max-h-[150px] object-contain bg-zinc-950"
                  style={{ contentVisibility: 'auto' }}
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    const img = e.currentTarget;
                    img.style.display = 'none';
                    const fallback = img.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none' }} className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                  {displayResult.substring(0, 100)}...
                </div>
                <a 
                  href={displayResult.trim()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Open full size
                </a>
              </div>
            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                {displayResult}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[80px] text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center mb-2">
              <FileOutput className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-500">
              Connect an AI node to see results here
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800/50 text-[11px] text-zinc-500">
        <span>{displayResult ? `${displayResult.length} characters` : 'Waiting for input'}</span>
        <div className="flex items-center gap-2">
          {displayResult && (
            <span className="flex items-center gap-1 text-emerald-500/70">
              <ArrowRight className="w-3 h-3" />
              <span>Can chain</span>
            </span>
          )}
          {nodeData.timestamp && (
            <span>{nodeData.timestamp}</span>
          )}
        </div>
      </div>

      {/* Input Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-emerald-400 hover:!bg-emerald-500 !transition-colors !z-50"
      />
      
      {/* Output Handle (Right) - For chaining to next nodes */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-emerald-400 hover:!bg-emerald-500 !transition-colors !z-50"
      />
    </div>
  );
};

export default memo(ResultNode);
