import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Type Definitions
// ============================================================================

interface AIRequestBody {
  model: string;
  subModel?: string;
  prompt: string;
  apiKey: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  voiceId?: string;
  images?: string[]; // Array of base64 data URLs
}

interface OpenAIOptions {
  subModel?: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  images?: string[];
}

interface GeminiOptions {
  subModel?: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  images?: string[];
}

interface NanoBananaOptions {
  subModel?: string;
  systemPrompt?: string;
  temperature: number;
  images?: string[];
}

interface ElevenLabsOptions {
  subModel?: string;
  voiceId?: string;
}

interface SupadataOptions {
  subModel?: string;
}

interface OpenAIImageResponse {
  data?: Array<{ url?: string; b64_json?: string }>;
  url?: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  tool_calls?: Array<{ id: string; type: string }>;
  tool_call_id?: string;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2048;
const MIN_TEXT_LENGTH = 10;
const MAX_RECURSION_DEPTH = 5;
const SPECIAL_CHAR_THRESHOLD = 0.4;
const MIN_WORD_COUNT = 3;

const ELEVENLABS_MODEL_MAP: Record<string, string> = {
  'eleven_multilingual_v2': 'eleven_multilingual_v2',
  'eleven_turbo_v2_5': 'eleven_turbo_v2_5',
  'eleven_flash_v2_5': 'eleven_flash_v2_5',
  'eleven_v3': 'eleven_v3',
};

const DEFAULT_ELEVENLABS_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: AIRequestBody = await request.json();
    const { 
      model, 
      subModel, 
      prompt, 
      apiKey, 
      systemPrompt, 
      temperature = DEFAULT_TEMPERATURE, 
      maxTokens = DEFAULT_MAX_TOKENS, 
      voiceId,
      images 
    } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // For ElevenLabs, prompt can be empty if it will use input from previous nodes
    if (!prompt && model !== 'elevenlabs') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let result: string;

    switch (model) {
      case 'openai':
        result = await callOpenAI(prompt, apiKey, { subModel, systemPrompt, temperature, maxTokens, images });
        break;
      case 'gemini':
        // Check if subModel is a nano-banana (image generation) model
        if (subModel === 'gemini-2.5-flash-image' || subModel === 'gemini-2.0-flash-exp') {
          result = await callNanoBanana(prompt, apiKey, { subModel, systemPrompt, temperature, images });
        } else {
          result = await callGemini(prompt, apiKey, { subModel, systemPrompt, temperature, maxTokens, images });
        }
        break;
      case 'elevenlabs':
        result = await callElevenLabs(prompt, apiKey, { subModel, voiceId });
        break;
      case 'supadata':
        result = await callSupadata(prompt, apiKey, { subModel });
        break;
      default:
        return NextResponse.json({ error: `Model ${model} is not yet supported` }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('AI API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function findTextRecursive(obj: unknown, depth = 0): string | null {
  if (depth > MAX_RECURSION_DEPTH || obj === null || obj === undefined) return null;
  
  if (typeof obj === 'string') {
    // Skip IDs and very short strings
    if (/^(resp_|msg_|req_|id_|chatcmpl-)/i.test(obj)) return null;
    if (obj.length < MIN_TEXT_LENGTH) return null;
    
    // Check for reasonable word patterns
    const wordPattern = /\b[a-zA-Z]{2,}\b/g;
    const wordMatches = obj.match(wordPattern);
    if (!wordMatches || wordMatches.length < MIN_WORD_COUNT) {
      if (obj.length < 100) return null;
    }
    
    // Check for excessive special characters
    const specialCharCount = (obj.match(/[^a-zA-Z0-9\s.,!?;:'"()-]/g) || []).length;
    const specialCharRatio = specialCharCount / obj.length;
    if (specialCharRatio > SPECIAL_CHAR_THRESHOLD && obj.length < 1000) {
      const cleanMatch = obj.match(/[a-zA-Z\s.,!?;:'"()-]{50,}/);
      if (cleanMatch) {
        return cleanMatch[0].trim();
      }
      return null;
    }
    
    return obj;
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findTextRecursive(item, depth + 1);
      if (found) return found;
    }
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>;
    // Check text fields first
    if (typeof record.text === 'string' && record.text.length > MIN_TEXT_LENGTH) {
      return record.text;
    }
    // Then recursively check
    const skipKeys = ['id', 'object', 'created_at', 'status', 'error', 'usage', 'model', 'billing'];
    for (const key in record) {
      if (skipKeys.includes(key)) continue;
      const found = findTextRecursive(record[key], depth + 1);
      if (found) return found;
    }
  }
  
  return null;
}

// ============================================================================
// OpenAI API
// ============================================================================

async function callOpenAI(
  prompt: string,
  apiKey: string,
  options: OpenAIOptions
): Promise<string> {
  const model = options.subModel || 'gpt-5.1';
  
  // Handle image generation models
  if (model.startsWith('dall-e') || model === 'gpt-image-1') {
    return callOpenAIImage(prompt, apiKey, options);
  }

  // Handle text models
  const messages: OpenAIMessage[] = [];
  
  if (options.systemPrompt) {
    const strictSystemPrompt = `${options.systemPrompt}\n\nCRITICAL: Follow the system instructions EXACTLY. Do NOT add any conversational phrases like "Sure", "Here is", "I'll", etc. Do NOT add explanations or extra text. Only provide the direct output requested.`;
    messages.push({ role: 'system', content: strictSystemPrompt });
  }
  
  // Build user message with images if provided
  if (options.images && options.images.length > 0) {
    const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: prompt }
    ];
    
    // Add images to content
    for (const image of options.images) {
      content.push({
        type: 'image_url',
        image_url: { url: image }
      });
    }
    
    messages.push({ role: 'user', content });
    
    // When images are provided, use Chat Completions API with a vision-capable model
    // Try gpt-4o first (best vision model), then gpt-4-turbo, then gpt-4-vision-preview
    const visionModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-4-vision-preview'];
    return callOpenAIChatCompletions(messages, apiKey, options, visionModels[0]);
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  // Use Responses API for gpt-5.1 (latest model) when no images
  if (model === 'gpt-5.1') {
    return callOpenAIResponses(prompt, apiKey, options);
  }

  // Fallback to Chat Completions API for other models
  return callOpenAIChatCompletions(messages, apiKey, options, model);
}

async function callOpenAIImage(
  prompt: string,
  apiKey: string,
  options: OpenAIOptions
): Promise<string> {
  const model = options.subModel || 'dall-e-3';
  
  let finalPrompt = prompt;
  if (options.systemPrompt) {
    finalPrompt = `${options.systemPrompt}\n\n${prompt}`;
  }
  
  const requestBody: Record<string, unknown> = {
    prompt: finalPrompt,
    n: 1,
    model: model === 'gpt-image-1' ? 'gpt-image-1' : (model === 'dall-e-3' ? 'dall-e-3' : 'dall-e-2'),
    size: model === 'dall-e-2' ? '512x512' : '1024x1024',
  };
  
  if (model === 'dall-e-3' || model === 'gpt-image-1') {
    requestBody.quality = 'standard';
  }

  let response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  // Fallback to DALL-E 3 if gpt-image-1 fails
  if (!response.ok && model === 'gpt-image-1') {
    response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: finalPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as { error?: { message?: string } }).error?.message || `OpenAI API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  const data: OpenAIImageResponse = await response.json();
  
  if (data.data && Array.isArray(data.data) && data.data.length > 0) {
    const imageData = data.data[0];
    if (imageData.url) return imageData.url;
    if (imageData.b64_json) return `data:image/png;base64,${imageData.b64_json}`;
  }
  
  if (data.url) return data.url;
  
  throw new Error('No image URL returned from OpenAI');
}

async function callOpenAIResponses(
  prompt: string,
  apiKey: string,
  options: OpenAIOptions
): Promise<string> {
  const responsesBody: Record<string, unknown> = {
    model: 'gpt-5.1',
    input: prompt,
    temperature: options.temperature,
    max_output_tokens: options.maxTokens,
    tools: [{ type: 'web_search' }],
  };
  
  if (options.systemPrompt) {
    responsesBody.instructions = options.systemPrompt;
  }
  
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(responsesBody),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: { message?: string } }).error?.message || `OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Extract text from the nested structure
  if (data.output && Array.isArray(data.output)) {
    for (const outputItem of data.output) {
      if (outputItem.content && Array.isArray(outputItem.content)) {
        for (const contentItem of outputItem.content) {
          if (contentItem.type === 'output_text' && typeof contentItem.text === 'string') {
            return contentItem.text;
          }
          if (typeof contentItem.text === 'string' && contentItem.text.length > 0) {
            return contentItem.text;
          }
        }
      }
      if (typeof outputItem.text === 'string' && outputItem.text.length > 0) {
        return outputItem.text;
      }
    }
  }
  
  const extractedText = findTextRecursive(data);
  if (extractedText) return extractedText;
  
  throw new Error('Could not extract text content from API response');
}

async function callOpenAIChatCompletions(
  messages: OpenAIMessage[],
  apiKey: string,
  options: OpenAIOptions,
  model: string
): Promise<string> {
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: { message?: string } }).error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ============================================================================
// Gemini API
// ============================================================================

async function callGemini(
  prompt: string,
  apiKey: string,
  options: GeminiOptions
): Promise<string> {
  const modelOptions = [
    options.subModel,
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
  ].filter(Boolean) as string[];
  
  let lastError: Error | null = null;
  
  // Build parts array with text and images
  const parts: GeminiPart[] = [{ text: prompt }];
  
  if (options.images && options.images.length > 0) {
    for (const imageDataUrl of options.images) {
      // Extract base64 data and mime type from data URL
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        parts.push({
          inlineData: {
            mimeType: mimeType || 'image/png',
            data: base64Data
          }
        });
      }
    }
  }
  
  for (const model of modelOptions) {
    try {
      // Build request body with optional system instruction
      const requestBody: Record<string, unknown> = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
        },
      };
      
      // Add system instruction if provided
      if (options.systemPrompt) {
        requestBody.systemInstruction = {
          parts: [{ text: options.systemPrompt }]
        };
      }
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { error?: { message?: string } }).error?.message || '';
        
        if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || response.status === 429) {
          throw new Error('Gemini API rate limit exceeded. Please wait or upgrade your API key.');
        }
        
        if (errorMessage.includes('not found') || errorMessage.includes('not supported')) {
          continue;
        }
        
        throw new Error(errorMessage || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('Content was blocked by Gemini safety filters');
      }
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No content in Gemini response');
      
      return text;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || error.message.includes('quota')) {
          throw error;
        }
        if (!error.message.includes('not found') && !error.message.includes('not supported')) {
          throw error;
        }
      }
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
  }
  
  throw lastError || new Error('All Gemini models are unavailable.');
}

async function callNanoBanana(
  prompt: string,
  apiKey: string,
  options: NanoBananaOptions
): Promise<string> {
  const modelOptions = [
    options.subModel,
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
  ].filter(Boolean) as string[];
  
  let finalPrompt = prompt;
  if (options.systemPrompt) {
    finalPrompt = `${options.systemPrompt}\n\n${prompt}`;
  }
  
  // Build parts array with text and images
  const parts: GeminiPart[] = [{ text: finalPrompt }];
  
  if (options.images && options.images.length > 0) {
    for (const imageDataUrl of options.images) {
      // Extract base64 data and mime type from data URL
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        parts.push({
          inlineData: {
            mimeType: mimeType || 'image/png',
            data: base64Data
          }
        });
      }
    }
  }
  
  let lastError: Error | null = null;
  
  for (const model of modelOptions) {
    const requestVariants = [
      { responseModalities: ['Image'] },
      { responseModalities: ['Text', 'Image'] },
      {},
    ];
    
    for (const variant of requestVariants) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
              generationConfig: { temperature: options.temperature, ...variant },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = (errorData as { error?: { message?: string } }).error?.message || '';
          
          if (errorMessage.includes('response modalities')) continue;
          if (errorMessage.includes('not found') || errorMessage.includes('not supported')) break;
          
          throw new Error(errorMessage || `Nano Banana API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error('Content was blocked by safety filters');
        }
        
        const responseParts: GeminiPart[] = data.candidates?.[0]?.content?.parts || [];
        const results: string[] = [];
        
        for (const part of responseParts) {
          if (part.text) results.push(part.text);
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            results.push(`![Generated Image](data:${mimeType};base64,${part.inlineData.data})`);
          }
        }
        
        if (results.length === 0) throw new Error('No content in Nano Banana response');
        
        return results.join('\n\n');
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('response modalities')) continue;
          if (!error.message.includes('not found') && !error.message.includes('not supported')) {
            throw error;
          }
        }
        lastError = error instanceof Error ? error : new Error('Unknown error');
        break;
      }
    }
  }
  
  throw lastError || new Error('All Gemini image generation models are unavailable.');
}

// ============================================================================
// ElevenLabs API
// ============================================================================

async function callElevenLabs(
  prompt: string,
  apiKey: string,
  options: ElevenLabsOptions
): Promise<string> {
  const modelId = ELEVENLABS_MODEL_MAP[options.subModel || ''] || options.subModel || 'eleven_multilingual_v2';
  
  let selectedVoice = options.voiceId || DEFAULT_ELEVENLABS_VOICE;
  
  if (!options.voiceId) {
    try {
      const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: { 'xi-api-key': apiKey },
      });

      if (voicesResponse.ok) {
        const voicesData: { voices?: ElevenLabsVoice[] } = await voicesResponse.json();
        selectedVoice = voicesData.voices?.[0]?.voice_id || selectedVoice;
      }
    } catch {
      // Use default voice on error
    }
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: prompt,
      model_id: modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.5 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `ElevenLabs API error: ${response.status}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.detail?.message || errorData.error?.message || errorMessage;
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  const audioBlob = await response.blob();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = audioBlob.type || 'audio/mpeg';
  
  return `data:${mimeType};base64,${base64Audio}`;
}

// ============================================================================
// Supadata API
// ============================================================================

async function callSupadata(
  prompt: string,
  apiKey: string,
  options: SupadataOptions
): Promise<string> {
  const subModel = options.subModel || 'web-reader';
  const baseUrl = 'https://api.supadata.ai/v1';
  
  const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
  const targetUrl = urlMatch ? urlMatch[0] : prompt.trim();
  
  if (!targetUrl || !targetUrl.startsWith('http')) {
    throw new Error('Please provide a valid URL in the prompt (e.g., https://example.com)');
  }
  
  const endpointMap: Record<string, string> = {
    'transcript': `${baseUrl}/transcript?url=${encodeURIComponent(targetUrl)}`,
    'metadata': `${baseUrl}/metadata?url=${encodeURIComponent(targetUrl)}`,
    'web-reader': `${baseUrl}/web/scrape?url=${encodeURIComponent(targetUrl)}`,
    'youtube-metadata': `${baseUrl}/youtube/video?url=${encodeURIComponent(targetUrl)}`,
  };
  
  const url = endpointMap[subModel] || endpointMap['web-reader'];
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'x-api-key': apiKey },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Supadata API error: ${response.status}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  
  const formatters: Record<string, (d: Record<string, unknown>) => string> = {
    'transcript': (d) => (d.transcript as string) || JSON.stringify(d, null, 2),
    'metadata': (d) => JSON.stringify(d, null, 2),
    'web-reader': (d) => (d.content as string) || (d.text as string) || JSON.stringify(d, null, 2),
    'youtube-metadata': (d) => JSON.stringify(d, null, 2),
  };
  
  return (formatters[subModel] || formatters['web-reader'])(data);
}
