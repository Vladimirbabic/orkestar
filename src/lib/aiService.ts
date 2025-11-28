import { AIModel } from '@/store/workflowStore';

interface AIResponse {
  success: boolean;
  result?: string;
  error?: string;
}

export async function runAIModel(
  model: AIModel,
  prompt: string,
  apiKey: string,
  options: {
    subModel?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    voiceId?: string;
    images?: string[];
  } = {}
): Promise<AIResponse> {
  const { subModel, systemPrompt, temperature = 0.7, maxTokens = 2048, voiceId, images } = options;

  // Only supported models
  if (!['openai', 'gemini', 'stable-diffusion', 'elevenlabs', 'custom', 'supadata'].includes(model)) {
    return { success: false, error: `Model ${model} is not yet supported for execution` };
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        subModel,
        prompt,
        apiKey,
        systemPrompt,
        temperature,
        maxTokens,
        voiceId,
        images,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || `API error: ${response.status}` };
    }

    return { success: true, result: data.result };
  } catch (error) {
    console.error('AI Service Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
