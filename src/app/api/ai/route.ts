import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, subModel, prompt, apiKey, systemPrompt, temperature = 0.7, maxTokens = 2048, voiceId } = body;

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
        result = await callOpenAI(prompt, apiKey, { subModel, systemPrompt, temperature, maxTokens });
        break;
      case 'gemini':
        // Check if subModel is a nano-banana (image generation) model
        if (subModel === 'gemini-2.5-flash-image' || subModel === 'gemini-2.0-flash-exp') {
          result = await callNanoBanana(prompt, apiKey, { subModel, systemPrompt, temperature });
        } else {
          result = await callGemini(prompt, apiKey, { subModel, temperature, maxTokens });
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

async function callOpenAI(
  prompt: string,
  apiKey: string,
  options: { subModel?: string; systemPrompt?: string; temperature: number; maxTokens: number }
): Promise<string> {
  const model = options.subModel || 'gpt-5.1';
  
  // Handle image generation models
  if (model.startsWith('dall-e') || model === 'gpt-image-1') {
    // For image generation, incorporate system prompt into the prompt
    // since image APIs don't support separate system prompts
    let finalPrompt = prompt;
    if (options.systemPrompt) {
      // Combine system prompt with user prompt for image generation
      // System prompt should be treated as critical style/quality instructions
      finalPrompt = `${options.systemPrompt}\n\n${prompt}`;
    }
    
    // Build request body according to OpenAI API spec
    const requestBody: any = {
      prompt: finalPrompt,
      n: 1,
    };

    // Add model parameter for gpt-image-1 (if it's a valid model)
    if (model === 'gpt-image-1') {
      // Note: gpt-image-1 might not be a valid model name for images/generations endpoint
      // According to OpenAI docs, images endpoint typically uses DALL-E models
      // We'll try with the model parameter, but fallback to DALL-E 3 if it fails
      requestBody.model = 'gpt-image-1';
      requestBody.size = '1024x1024'; // Default size
      requestBody.quality = 'standard'; // Can be 'standard' or 'hd'
    } else {
      // DALL-E models
      requestBody.model = model === 'dall-e-3' ? 'dall-e-3' : 'dall-e-2';
      requestBody.size = model === 'dall-e-3' ? '1024x1024' : '512x512';
      if (model === 'dall-e-3') {
        requestBody.quality = 'standard'; // DALL-E 3 supports 'standard' or 'hd'
      }
    }

    let response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    // If gpt-image-1 fails, fallback to DALL-E 3 (latest image model)
    if (!response.ok && model === 'gpt-image-1') {
      const errorData = await response.json().catch(() => ({}));
      console.warn('gpt-image-1 model not available, falling back to DALL-E 3:', errorData);
      
      // Retry with DALL-E 3 (the actual latest OpenAI image model)
      const fallbackBody = {
        model: 'dall-e-3',
        prompt: finalPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      };
      
      response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(fallbackBody),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `OpenAI API error: ${response.status}`;
      console.error('OpenAI Image API Error:', errorData);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Handle response format - can be 'url' or 'b64_json'
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      const imageData = data.data[0];
      // Check if it's a URL or base64
      if (imageData.url) {
        return imageData.url;
      } else if (imageData.b64_json) {
        // Convert base64 to data URL
        return `data:image/png;base64,${imageData.b64_json}`;
      }
    }
    
    // Fallback: check for direct url property
    if (data.url) {
      return data.url;
    }
    
    console.error('Unexpected OpenAI response format:', data);
    throw new Error('No image URL returned from OpenAI');
  }

  // Handle text models
  const messages = [];
  
  if (options.systemPrompt) {
    // Enforce system prompt strictly - add instruction to follow it exactly
    const strictSystemPrompt = `${options.systemPrompt}\n\nCRITICAL: Follow the system instructions EXACTLY. Do NOT add any conversational phrases like "Sure", "Here is", "I'll", etc. Do NOT add explanations or extra text. Only provide the direct output requested.`;
    messages.push({ role: 'system', content: strictSystemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  // Use Responses API for gpt-5.1 (latest model)
  if (model === 'gpt-5.1') {
    try {
      const responsesBody: any = {
        model: 'gpt-5.1',
        input: prompt,
        temperature: options.temperature,
        max_output_tokens: options.maxTokens,
      };
      
      if (options.systemPrompt) {
        responsesBody.instructions = options.systemPrompt;
      }
      
      // Add web search tool
      responsesBody.tools = [
        {
          type: 'web_search',
        },
      ];
      
      const responsesResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(responsesBody),
      });
      
      if (!responsesResponse.ok) {
        const errorData = await responsesResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${responsesResponse.status}`);
      }
      
      const responsesData = await responsesResponse.json();
      
      // Extract text from the nested structure: output[0].content[0].text
      if (responsesData.output && Array.isArray(responsesData.output) && responsesData.output.length > 0) {
        for (const outputItem of responsesData.output) {
          if (outputItem.content && Array.isArray(outputItem.content)) {
            for (const contentItem of outputItem.content) {
              // Look for output_text type with text field
              if (contentItem.type === 'output_text' && contentItem.text && typeof contentItem.text === 'string') {
                return contentItem.text;
              }
              // Also check if contentItem itself has a text field
              if (contentItem.text && typeof contentItem.text === 'string' && contentItem.text.length > 0) {
                return contentItem.text;
              }
            }
          }
          // Check if outputItem has direct text/content
          if (outputItem.text && typeof outputItem.text === 'string' && outputItem.text.length > 0) {
            return outputItem.text;
          }
        }
      }
      
      // Try to find any text field in the response
      const findTextRecursive = (obj: any, depth = 0): string | null => {
        if (depth > 5 || obj === null || obj === undefined) return null;
        
        if (typeof obj === 'string') {
          // Skip IDs and very short strings
          if (obj.match(/^(resp_|msg_|req_|id_|chatcmpl-)/i)) return null;
          if (obj.length < 10) return null;
          
          // Validate it looks like actual content, not corrupted data
          // Check for reasonable word patterns
          const wordPattern = /\b[a-zA-Z]{2,}\b/g;
          const wordMatches = obj.match(wordPattern);
          if (!wordMatches || wordMatches.length < 3) {
            // Not enough words, might be metadata
            if (obj.length < 100) return null;
          }
          
          // Check for excessive special characters (might be corrupted)
          const specialCharRatio = (obj.match(/[^a-zA-Z0-9\s.,!?;:'"()-]/g) || []).length / obj.length;
          if (specialCharRatio > 0.4 && obj.length < 1000) {
            // Too many special chars, might be corrupted - try to find clean substring
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
        
        if (typeof obj === 'object') {
          // Check text fields first
          if (obj.text && typeof obj.text === 'string' && obj.text.length > 10) {
            return obj.text;
          }
          // Then recursively check
          for (const key in obj) {
            if (['id', 'object', 'created_at', 'status', 'error', 'usage', 'model', 'billing'].includes(key)) {
              continue;
            }
            const found = findTextRecursive(obj[key], depth + 1);
            if (found) return found;
          }
        }
        
        return null;
      };
      
      const extractedText = findTextRecursive(responsesData);
      if (extractedText) {
        return extractedText;
      }
      
      // Last resort: return error message
      console.error('Could not extract text from GPT-5.1 response:', JSON.stringify(responsesData, null, 2));
      throw new Error('Could not extract text content from API response');
    } catch (error) {
      console.error('Responses API error:', error);
      throw error;
    }
  }

  // Determine the actual model name and web search support for other models
  // Models that support web search: gpt-4o, gpt-4-turbo, o1-preview, o1-mini
  const supportsWebSearch = ['gpt-4-turbo-web', 'gpt-4o', 'gpt-4-turbo', 'o1-preview', 'o1-mini'].includes(model);
  const actualModel = model === 'gpt-4-turbo-web' ? 'gpt-4-turbo' : 
                      model === 'gpt-4o' ? 'gpt-4o' :
                      model === 'o1-preview' ? 'o1-preview' :
                      model === 'o1-mini' ? 'o1-mini' : model;
  
  // Build request body
  const requestBody: any = {
    model: actualModel,
    messages,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
  };

  // Add web search tool for supported models
  if (supportsWebSearch) {
    // OpenAI's web search tool format (for Chat Completions API)
    // Note: Some models may require Responses API instead
    requestBody.tools = [
      {
        type: 'web_search',
      },
    ];
    requestBody.tool_choice = 'auto'; // Let the model decide when to use web search
  }

  let response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `OpenAI API error: ${response.status}`;
    // If web_search tool is not supported, try without it or use Responses API
    if (supportsWebSearch && (errorMessage.includes('tool') || errorMessage.includes('web_search') || errorMessage.includes('not supported'))) {
      console.warn('Web search tool not available in Chat Completions, trying Responses API');
      
      // Try Responses API for web search (newer API)
      try {
        const responsesBody = {
          model: actualModel,
          tools: [{ type: 'web_search' }],
          input: prompt,
        };
        
        const responsesResponse = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(responsesBody),
        });
        
        if (responsesResponse.ok) {
          const responsesData = await responsesResponse.json();
          return responsesData.output_text || JSON.stringify(responsesData, null, 2);
        }
      } catch (responsesError) {
        console.warn('Responses API also failed, falling back to standard model');
      }
      
      // Fallback: Remove tools and try again with Chat Completions
      delete requestBody.tools;
      delete requestBody.tool_choice;
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const fallbackError = await response.json().catch(() => ({}));
        throw new Error(fallbackError.error?.message || `OpenAI API error: ${response.status}`);
      }
    } else {
      throw new Error(errorMessage);
    }
  }

  const data = await response.json();
  
  // Handle tool calls (for web search) - need to make follow-up request
  let message = data.choices[0]?.message;
  
  if (message?.tool_calls && message.tool_calls.length > 0) {
    // Add tool call results to messages and make follow-up request
    const toolMessages = message.tool_calls.map((toolCall: any) => ({
      role: 'tool' as const,
      tool_call_id: toolCall.id,
      // For web_search, OpenAI handles this internally, but we need to acknowledge
      content: 'Web search completed',
    }));
    
    // Add assistant message and tool results to conversation
    const followUpMessages = [
      ...messages,
      message,
      ...toolMessages,
    ];
    
    // Make follow-up request to get final response with search results
    const followUpBody = {
      ...requestBody,
      messages: followUpMessages,
    };
    // Remove tools from follow-up to get final answer
    delete followUpBody.tools;
    delete followUpBody.tool_choice;
    
    const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(followUpBody),
    });
    
    if (!followUpResponse.ok) {
      // If follow-up fails, return the initial message content if available
      return message.content || 'Web search was initiated but could not complete.';
    }
    
    const followUpData = await followUpResponse.json();
    message = followUpData.choices[0]?.message;
  }
  
  return message?.content || '';
}

async function callClaude(
  prompt: string,
  apiKey: string,
  options: { subModel?: string; systemPrompt?: string; temperature: number; maxTokens: number }
): Promise<string> {
  const model = options.subModel || 'claude-3-5-sonnet-20241022';
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model,
      max_tokens: options.maxTokens,
      system: options.systemPrompt || undefined,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

async function callGemini(
  prompt: string,
  apiKey: string,
  options: { subModel?: string; temperature: number; maxTokens: number }
): Promise<string> {
  // Try multiple model names as fallback - use more stable models first
  const modelOptions = [
    options.subModel,
    'gemini-1.5-flash', // Most stable and widely available
    'gemini-1.5-pro',   // Fallback to pro
    'gemini-2.0-flash', // Latest but may have rate limits
  ].filter(Boolean) as string[];
  
  let lastError: any = null;
  
  // Try each model option
  for (const model of modelOptions) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ 
              role: 'user',
              parts: [{ text: prompt }] 
            }],
            generationConfig: {
              temperature: options.temperature,
              maxOutputTokens: options.maxTokens,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || '';
        lastError = errorData;
        
        // Check for rate limit errors
        if (errorMessage.includes('quota') || 
            errorMessage.includes('rate limit') || 
            errorMessage.includes('RESOURCE_EXHAUSTED') ||
            response.status === 429) {
          throw new Error(`Gemini API rate limit exceeded. Free tier allows 50-150 requests per day. Please wait or upgrade your API key.`);
        }
        
        // If model not found, try next model
        if (errorMessage.includes('not found') || 
            errorMessage.includes('not supported') ||
            errorMessage.includes('not available')) {
          console.warn(`Model ${model} not available, trying next option...`);
          continue;
        }
        
        // Other errors, throw immediately
        console.error('Gemini API Error:', errorData);
        throw new Error(errorMessage || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Check for blocked content
      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('Content was blocked by Gemini safety filters');
      }
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error('Gemini response:', JSON.stringify(data, null, 2));
        throw new Error('No content in Gemini response');
      }
      
      return text;
    } catch (error) {
      // If it's a rate limit error, throw it immediately
      if (error instanceof Error && 
          (error.message.includes('rate limit') || error.message.includes('quota'))) {
        throw error;
      }
      
      // If it's not a "model not found" error, throw it
      if (error instanceof Error && 
          !error.message.includes('not found') && 
          !error.message.includes('not supported') &&
          !error.message.includes('not available')) {
        throw error;
      }
      lastError = error;
      continue;
    }
  }
  
  // All models failed
  const errorMessage = lastError?.error?.message || 'All Gemini models are unavailable. This might be due to rate limits or regional restrictions.';
  console.error('Gemini: All model options failed. Last error:', lastError);
  throw new Error(errorMessage);
}

async function callNanoBanana(
  prompt: string,
  apiKey: string,
  options: { subModel?: string; systemPrompt?: string; temperature: number }
): Promise<string> {
  // Nano Banana uses Gemini's image generation model
  // Try different model names as fallback - use models that support image generation
  const modelOptions = [
    options.subModel,
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
  ].filter(Boolean) as string[];
  
  // For image generation, incorporate system prompt into the prompt
  let finalPrompt = prompt;
  if (options.systemPrompt) {
    // Combine system prompt with user prompt for image generation
    // System prompt should be treated as critical style/quality instructions
    finalPrompt = `${options.systemPrompt}\n\n${prompt}`;
  }
  
  let lastError: any = null;
  
  // Try each model option
  for (const model of modelOptions) {
    // Try with and without responseModalities
    const requestVariants = [
      { responseModalities: ['Image'] }, // Try with Image modality first
      { responseModalities: ['Text', 'Image'] }, // Try with both
      {}, // Try without responseModalities
    ];
    
    for (const variant of requestVariants) {
      try {
        const requestBody: any = {
          contents: [{ 
            role: 'user',
            parts: [{ text: finalPrompt }] 
          }],
          generationConfig: {
            temperature: options.temperature,
            ...variant,
          },
        };
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || '';
          
          // If response modalities error, try next variant
          if (errorMessage.includes('response modalities')) {
            console.warn(`Model ${model} doesn't support this responseModalities variant, trying next...`);
            continue; // Try next variant
          }
          
          // If model not found, try next model
          if (errorMessage.includes('not found') || errorMessage.includes('not supported')) {
            lastError = errorData;
            break; // Break out of variant loop, try next model
          }
          
          // Other errors, throw immediately
          console.error('Nano Banana API Error:', errorData);
          throw new Error(errorMessage || `Nano Banana API error: ${response.status}`);
        }
        
        // Success - process the response
        const data = await response.json();
        
        // Check for blocked content
        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error('Content was blocked by safety filters');
        }
        
        // Process response - could be text, image, or both
        const parts = data.candidates?.[0]?.content?.parts || [];
        const results: string[] = [];
        
        for (const part of parts) {
          if (part.text) {
            results.push(part.text);
          }
          if (part.inlineData) {
            // Return image as base64 data URL
            const mimeType = part.inlineData.mimeType || 'image/png';
            const base64Data = part.inlineData.data;
            results.push(`![Generated Image](data:${mimeType};base64,${base64Data})`);
          }
        }
        
        if (results.length === 0) {
          console.error('Nano Banana response:', JSON.stringify(data, null, 2));
          throw new Error('No content in Nano Banana response');
        }
        
        return results.join('\n\n');
      } catch (error) {
        // If it's a response modalities error, try next variant
        if (error instanceof Error && error.message.includes('response modalities')) {
          continue; // Try next variant
        }
        // If it's not a "model not found" error, throw it
        if (error instanceof Error && !error.message.includes('not found') && !error.message.includes('not supported')) {
          throw error;
        }
        lastError = error;
        break; // Break out of variant loop, try next model
      }
    }
  }
  
  // All models failed
  const errorMessage = lastError?.error?.message || 'All Gemini image generation models are unavailable. This might be due to regional restrictions.';
  console.error('Nano Banana: All model options failed. Last error:', lastError);
  throw new Error(errorMessage);
}

async function callFalNanoBanana(
  prompt: string,
  apiKey: string,
  options: { subModel?: string; systemPrompt?: string }
): Promise<string> {
  const model = options.subModel || 'fal-ai/nano-banana-pro';
  
  // For image generation, incorporate system prompt into the prompt
  let finalPrompt = prompt;
  if (options.systemPrompt) {
    finalPrompt = `${options.systemPrompt}\n\n${prompt}`;
  }

  try {
    // Try direct inference endpoint first
    const response = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        num_images: 1,
        aspect_ratio: '1:1',
        output_format: 'png',
        resolution: '1K',
      }),
    });

    if (!response.ok) {
      // If direct endpoint fails, try queue API
      if (response.status === 404 || response.status === 405) {
        return await callFalNanoBananaQueue(model, finalPrompt, apiKey);
      }
      
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail?.message || errorData.error?.message || `Fal API error: ${response.status}`;
      console.error('Fal Nano Banana API Error:', errorData);
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Handle response format - return the first image URL
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      const imageData = data.images[0];
      if (imageData.url) {
        return imageData.url;
      }
    }
    
    // Fallback: check for direct url property
    if (data.url) {
      return data.url;
    }
    
    console.error('Unexpected Fal Nano Banana response format:', data);
    throw new Error('No image URL returned from Fal Nano Banana');
  } catch (error) {
    console.error('Fal Nano Banana API Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while calling Fal Nano Banana API');
  }
}

async function callFalNanoBananaQueue(
  model: string,
  finalPrompt: string,
  apiKey: string
): Promise<string> {
  // Submit request to Fal.ai queue API
  const submitResponse = await fetch(`https://queue.fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: finalPrompt,
      num_images: 1,
      aspect_ratio: '1:1',
      output_format: 'png',
      resolution: '1K',
    }),
  });

  if (!submitResponse.ok) {
    const errorData = await submitResponse.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || `Fal API error: ${submitResponse.status}`);
  }

  const submitData = await submitResponse.json();
  const requestId = submitData.request_id;

  if (!requestId) {
    throw new Error('No request_id returned from Fal API');
  }

  // Poll for result
  let attempts = 0;
  const maxAttempts = 60;
  const pollInterval = 1000;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    attempts++;

    const statusResponse = await fetch(`https://queue.fal.run/${model}/requests/${requestId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      const errorData = await statusResponse.json().catch(() => ({}));
      throw new Error(errorData.detail?.message || `Failed to check status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    
    if (statusData.status === 'COMPLETED') {
      const resultResponse = await fetch(`https://queue.fal.run/${model}/requests/${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${apiKey}`,
        },
      });

      if (!resultResponse.ok) {
        throw new Error(`Failed to get result: ${resultResponse.status}`);
      }

      const resultData = await resultResponse.json();

      if (resultData.images && Array.isArray(resultData.images) && resultData.images.length > 0) {
        const imageData = resultData.images[0];
        if (imageData.url) {
          return imageData.url;
        }
      }
      
      if (resultData.url) {
        return resultData.url;
      }
      
      throw new Error('No image URL returned from Fal Nano Banana');
    } else if (statusData.status === 'FAILED') {
      throw new Error(statusData.error || 'Request failed');
    }
  }

  throw new Error('Request timed out after 60 seconds');
}

async function callVeo2(
  prompt: string,
  apiKey: string,
  options: { subModel?: string; systemPrompt?: string }
): Promise<string> {
  const model = options.subModel || 'fal-ai/veo2/image-to-video';
  
  // Extract image URL from prompt or system prompt
  // Veo2 requires an image_url parameter
  const urlPattern = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp))/i;
  let imageUrl = '';
  let animationPrompt = prompt;
  
  // Try to find image URL in prompt
  const urlMatch = prompt.match(urlPattern);
  if (urlMatch) {
    imageUrl = urlMatch[0];
    // Remove URL from prompt to use as animation description
    animationPrompt = prompt.replace(urlPattern, '').trim();
  } else if (options.systemPrompt) {
    // Try system prompt
    const systemUrlMatch = options.systemPrompt.match(urlPattern);
    if (systemUrlMatch) {
      imageUrl = systemUrlMatch[0];
      // Combine system prompt with prompt for animation description
      animationPrompt = `${options.systemPrompt.replace(urlPattern, '').trim()}\n\n${prompt}`.trim();
    }
  }
  
  // If no URL found, check if entire prompt is a URL
  if (!imageUrl && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)/i.test(prompt.trim())) {
    imageUrl = prompt.trim();
    animationPrompt = 'Animate this image with natural motion';
  }
  
  if (!imageUrl) {
    throw new Error('Veo2 requires an image URL. Please provide an image URL in the prompt or system prompt (e.g., https://example.com/image.png)');
  }
  
  // Combine system prompt with animation prompt if no URL was in system prompt
  if (options.systemPrompt && !options.systemPrompt.match(urlPattern)) {
    animationPrompt = `${options.systemPrompt}\n\n${animationPrompt}`.trim();
  }
  
  // If animation prompt is empty, provide default
  if (!animationPrompt || animationPrompt.length === 0) {
    animationPrompt = 'Animate this image with natural motion';
  }

  try {
    // Try direct inference endpoint first
    const response = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: animationPrompt,
        image_url: imageUrl,
        aspect_ratio: 'auto',
        duration: '5s',
      }),
    });

    if (!response.ok) {
      // If direct endpoint fails, try queue API
      if (response.status === 404 || response.status === 405) {
        return await callVeo2Queue(model, animationPrompt, imageUrl, apiKey);
      }
      
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail?.message || errorData.error?.message || `Fal API error: ${response.status}`;
      console.error('Veo2 API Error:', errorData);
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Handle response format - return video URL
    if (data.video?.url) {
      return data.video.url;
    }
    
    // Fallback: check for direct url property
    if (data.url) {
      return data.url;
    }
    
    console.error('Unexpected Veo2 response format:', data);
    throw new Error('No video URL returned from Veo2');
  } catch (error) {
    console.error('Veo2 API Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while calling Veo2 API');
  }
}

async function callVeo2Queue(
  model: string,
  animationPrompt: string,
  imageUrl: string,
  apiKey: string
): Promise<string> {
  // Submit request to Fal.ai queue API
  const submitResponse = await fetch(`https://queue.fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: animationPrompt,
      image_url: imageUrl,
      aspect_ratio: 'auto',
      duration: '5s',
    }),
  });

  if (!submitResponse.ok) {
    const errorData = await submitResponse.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || `Fal API error: ${submitResponse.status}`);
  }

  const submitData = await submitResponse.json();
  const requestId = submitData.request_id;

  if (!requestId) {
    throw new Error('No request_id returned from Fal API');
  }

  // Poll for result
  let attempts = 0;
  const maxAttempts = 120; // 120 seconds for video generation
  const pollInterval = 2000; // 2 seconds

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    attempts++;

    const statusResponse = await fetch(`https://queue.fal.run/${model}/requests/${requestId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      const errorData = await statusResponse.json().catch(() => ({}));
      throw new Error(errorData.detail?.message || `Failed to check status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    
    if (statusData.status === 'COMPLETED') {
      const resultResponse = await fetch(`https://queue.fal.run/${model}/requests/${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${apiKey}`,
        },
      });

      if (!resultResponse.ok) {
        throw new Error(`Failed to get result: ${resultResponse.status}`);
      }

      const resultData = await resultResponse.json();

      if (resultData.video?.url) {
        return resultData.video.url;
      }
      
      if (resultData.url) {
        return resultData.url;
      }
      
      throw new Error('No video URL returned from Veo2');
    } else if (statusData.status === 'FAILED') {
      throw new Error(statusData.error || 'Request failed');
    }
  }

  throw new Error('Request timed out after 120 seconds');
}

async function callElevenLabs(
  prompt: string,
  apiKey: string,
  options: { subModel?: string; voiceId?: string }
): Promise<string> {
  // Map our model IDs to ElevenLabs API model IDs
  const modelMap: Record<string, string> = {
    'eleven_multilingual_v2': 'eleven_multilingual_v2',
    'eleven_turbo_v2_5': 'eleven_turbo_v2_5',
    'eleven_flash_v2_5': 'eleven_flash_v2_5',
    'eleven_v3': 'eleven_v3',
  };
  
  const modelId = modelMap[options.subModel || ''] || options.subModel || 'eleven_multilingual_v2';
  
  // Use provided voiceId or fetch available voices to get default
  let selectedVoice = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel voice as fallback
  
  if (!options.voiceId) {
    // Only fetch voices if no voiceId is provided
    try {
      const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (voicesResponse.ok) {
        const voicesData = await voicesResponse.json();
        selectedVoice = voicesData.voices?.[0]?.voice_id || selectedVoice;
      } else {
        // If voices API fails, log but continue with default voice
        const errorText = await voicesResponse.text();
        console.warn('Failed to fetch voices, using default:', errorText);
      }
    } catch (error) {
      // If voices API fails, continue with default voice
      console.warn('Error fetching voices, using default voice:', error);
    }
  }

  // Generate speech
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: prompt,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || `HTTP ${response.status}` };
    }
    const errorMessage = errorData.detail?.message || errorData.error?.message || errorData.message || `ElevenLabs API error: ${response.status}`;
    console.error('ElevenLabs API Error:', errorData);
    throw new Error(errorMessage);
  }

  // Get the audio data as a blob
  const audioBlob = await response.blob();
  
  // Convert to base64 data URL
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = audioBlob.type || 'audio/mpeg';
  
  // Return as data URL so it can be played in the browser
  return `data:${mimeType};base64,${base64Audio}`;
}

async function callSupadata(
  prompt: string,
  apiKey: string,
  options: { subModel?: string }
): Promise<string> {
  const subModel = options.subModel || 'web-reader';
  const baseUrl = 'https://api.supadata.ai/v1';
  
  // Extract URL from prompt (assume prompt contains the URL)
  const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
  const targetUrl = urlMatch ? urlMatch[0] : prompt.trim();
  
  if (!targetUrl || !targetUrl.startsWith('http')) {
    throw new Error('Please provide a valid URL in the prompt (e.g., https://example.com)');
  }
  
  // Map subModel to endpoint - based on Supadata API structure
  // All endpoints use GET with query parameters
  let url: string;
  let headers: Record<string, string> = {
    'x-api-key': apiKey,
  };
  
  if (subModel === 'transcript') {
    // GET /v1/transcript?url=...
    url = `${baseUrl}/transcript?url=${encodeURIComponent(targetUrl)}`;
  } else if (subModel === 'metadata') {
    // GET /v1/metadata?url=...
    url = `${baseUrl}/metadata?url=${encodeURIComponent(targetUrl)}`;
  } else if (subModel === 'web-reader') {
    // GET /v1/web/scrape?url=...
    url = `${baseUrl}/web/scrape?url=${encodeURIComponent(targetUrl)}`;
  } else if (subModel === 'youtube-metadata') {
    // GET /v1/youtube/video?url=...
    url = `${baseUrl}/youtube/video?url=${encodeURIComponent(targetUrl)}`;
  } else {
    // Default to web scrape
    url = `${baseUrl}/web/scrape?url=${encodeURIComponent(targetUrl)}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || `HTTP ${response.status}` };
    }
    throw new Error(errorData.error || errorData.message || `Supadata API error: ${response.status} - URL: ${url} - ${errorText.substring(0, 200)}`);
  }
  
  const data = await response.json();
  
  // Format response based on endpoint
  if (subModel === 'transcript') {
    return data.transcript || JSON.stringify(data, null, 2);
  } else if (subModel === 'metadata') {
    return JSON.stringify(data, null, 2);
  } else if (subModel === 'web-reader') {
    return data.content || data.text || JSON.stringify(data, null, 2);
  } else if (subModel === 'youtube-metadata') {
    return JSON.stringify(data, null, 2);
  }
  
  return JSON.stringify(data, null, 2);
}

