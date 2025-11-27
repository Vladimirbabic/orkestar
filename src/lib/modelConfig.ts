import { AIModel, SubModel } from '@/store/workflowStore';

export interface ModelVariant {
  id: SubModel;
  label: string;
  description?: string;
  category: 'text' | 'image' | 'audio';
}

export const modelVariants: Record<AIModel, ModelVariant[]> = {
  openai: [
    { id: 'gpt-5.1', label: 'GPT-5.1', description: 'OpenAI latest flagship model', category: 'text' },
  ],
  gemini: [
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Fast and stable (recommended)', category: 'text' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Most capable', category: 'text' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Latest (may have rate limits)', category: 'text' },
    { id: 'gemini-2.5-flash-image', label: 'Nano Banana 2.5', description: 'Latest image generation', category: 'image' },
    { id: 'gemini-2.0-flash-exp', label: 'Nano Banana 2.0', description: 'Image generation', category: 'image' },
  ],
  'stable-diffusion': [
    { id: 'stable-diffusion-xl', label: 'Stable Diffusion XL', description: 'High quality images', category: 'image' },
  ],
  elevenlabs: [
    { id: 'eleven_multilingual_v2', label: 'Eleven Multilingual v2', description: '29 languages, 10K char limit', category: 'audio' },
    { id: 'eleven_turbo_v2_5', label: 'Eleven Turbo v2.5', description: 'High quality, low latency', category: 'audio' },
    { id: 'eleven_flash_v2_5', label: 'Eleven Flash v2.5', description: 'Ultra-fast, affordable', category: 'audio' },
    { id: 'eleven_v3', label: 'Eleven v3', description: 'Most expressive, 70+ languages', category: 'audio' },
  ],
  custom: [
    { id: 'custom', label: 'Custom', description: 'Your endpoint', category: 'text' },
  ],
  supadata: [
    { id: 'transcript', label: 'Video Transcript', description: 'Extract transcripts from videos', category: 'text' },
    { id: 'metadata', label: 'Media Metadata', description: 'Get social media post data', category: 'text' },
    { id: 'web-reader', label: 'Web Reader', description: 'Extract content from websites', category: 'text' },
    { id: 'youtube-metadata', label: 'YouTube Metadata', description: 'Extract video/channel metadata', category: 'text' },
  ],
};

export function getDefaultSubModel(model: AIModel): SubModel {
  const variants = modelVariants[model];
  return variants?.[0]?.id || 'custom';
}

export function getSubModelLabel(model: AIModel, subModel?: SubModel): string {
  if (!subModel) return modelVariants[model]?.[0]?.label || model;
  const variant = modelVariants[model]?.find((v) => v.id === subModel);
  return variant?.label || subModel;
}

