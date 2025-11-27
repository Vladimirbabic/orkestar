# Codebase Review & Optimization Recommendations

## Executive Summary

This document provides a comprehensive review of the Workflow Builder codebase with specific recommendations for optimization, refactoring, and improvements. All recommendations preserve existing functionality while improving code quality, performance, and maintainability.

---

## 1. Code Organization & Architecture

### 1.1 Large File Splitting

**Issue**: `src/app/api/ai/route.ts` is 1198 lines - too large for maintainability.

**Recommendation**: Split into separate files:
```
src/lib/ai/
  ├── providers/
  │   ├── openai.ts
  │   ├── gemini.ts
  │   ├── elevenlabs.ts
  │   ├── supadata.ts
  │   └── index.ts
  ├── types.ts
  └── route.ts (main handler, ~100 lines)
```

**Benefits**:
- Better code organization
- Easier testing
- Clearer separation of concerns
- Reduced merge conflicts

### 1.2 Extract Constants

**Issue**: Model configurations, API endpoints, and magic strings scattered across files.

**Recommendation**: Create `src/lib/constants.ts`:
```typescript
export const API_ENDPOINTS = {
  OPENAI: 'https://api.openai.com/v1',
  GEMINI: 'https://generativelanguage.googleapis.com/v1beta',
  ELEVENLABS: 'https://api.elevenlabs.io/v1',
  // ...
} as const;

export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
export const MAX_RECURSION_DEPTH = 10;
// ...
```

---

## 2. Code Duplication

### 2.1 Prompt Building Logic

**Issue**: `executeNode` and `executeSingleNode` in `workflowExecutor.ts` have duplicate prompt building logic (lines 118-135 and 205-228).

**Recommendation**: Extract to shared function:
```typescript
// src/lib/workflowExecutor.ts
function buildPrompt(
  data: NodeData,
  combinedInput: string,
  model: AIModel
): string {
  if (model === 'elevenlabs') {
    return combinedInput || data.prompt || '';
  }
  
  let prompt = data.prompt || '';
  
  if (combinedInput) {
    if (prompt.includes('{{input}}')) {
      prompt = prompt.replace(/\{\{input\}\}/g, combinedInput);
    } else {
      prompt = `Here is the context/input from the previous step:\n\n${combinedInput}\n\n---\n\nNow, please do the following:\n\n${prompt}`;
    }
  }
  
  return prompt;
}
```

### 2.2 Error Handling Patterns

**Issue**: Similar error handling code repeated across API routes.

**Recommendation**: Create error utility:
```typescript
// src/lib/errors.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown): NextResponse {
  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

### 2.3 Input Collection Logic

**Issue**: Duplicate code for collecting inputs from connected nodes.

**Recommendation**: Extract to utility:
```typescript
// src/lib/workflowExecutor.ts
function collectNodeInputs(
  nodeId: string,
  edges: Edge[],
  nodeOutputs: Map<string, string>
): string {
  const inputEdges = edges.filter((e) => e.target === nodeId);
  const inputs: string[] = [];
  
  for (const edge of inputEdges) {
    const output = nodeOutputs.get(edge.source);
    if (output) {
      inputs.push(output);
    }
  }
  
  return inputs.join('\n\n---\n\n');
}
```

---

## 3. Performance Optimizations

### 3.1 Voice Loading Caching

**Issue**: Voices are fetched on every component mount for ElevenLabs nodes.

**Recommendation**: Cache voices in settings store or create a shared cache:
```typescript
// src/lib/voiceCache.ts
let voiceCache: {
  voices: Array<{ voice_id: string; name: string }>;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getVoices(apiKey: string): Promise<Array<{ voice_id: string; name: string }>> {
  if (voiceCache && Date.now() - voiceCache.timestamp < CACHE_TTL) {
    return voiceCache.voices;
  }
  
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  });
  
  const data = await response.json();
  voiceCache = {
    voices: data.voices || [],
    timestamp: Date.now(),
  };
  
  return voiceCache.voices;
}
```

### 3.2 API Key Sync Debouncing

**Issue**: API keys sync to Supabase on every set/remove operation.

**Recommendation**: Debounce sync operations:
```typescript
// src/store/settingsStore.ts
import { debounce } from 'lodash-es'; // or implement custom debounce

const debouncedSync = debounce(async (keys: APIKeys) => {
  await saveApiKeys(keys);
}, 1000);

setApiKey: async (model, key) => {
  set((state) => ({
    apiKeys: { ...state.apiKeys, [model]: key },
  }));
  debouncedSync(get().apiKeys);
},
```

### 3.3 Memoization for Expensive Computations

**Issue**: `extractResponseContent` in `ResultNode.tsx` runs on every render.

**Recommendation**: Memoize the result:
```typescript
// src/components/nodes/ResultNode.tsx
import { useMemo } from 'react';

const displayResult = useMemo(
  () => data.result ? extractResponseContent(data.result) : '',
  [data.result]
);
```

### 3.4 Context Loading Optimization

**Issue**: Contexts are loaded individually per node.

**Recommendation**: Load all contexts once at app level and share:
```typescript
// src/context/ContextsContext.tsx
export const ContextsProvider = ({ children }) => {
  const [contexts, setContexts] = useState<Context[]>([]);
  // Load once, share everywhere
};
```

---

## 4. Type Safety Improvements

### 4.1 Remove `any` Types

**Issue**: Multiple `any` types in API route handlers and response parsers.

**Recommendation**: Define proper types:
```typescript
// src/lib/ai/types.ts
export interface OpenAIResponse {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
    text?: string;
  }>;
  // ... other fields
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  // ... other fields
}
```

### 4.2 Strict Error Types

**Issue**: Generic error handling with `unknown` or `any`.

**Recommendation**: Use discriminated unions:
```typescript
type APIErrorResponse = 
  | { error: { message: string; code?: string } }
  | { detail: { message: string } }
  | { message: string };

function parseErrorResponse(data: unknown): string {
  if (typeof data === 'object' && data !== null) {
    if ('error' in data && typeof data.error === 'object') {
      return data.error.message || 'Unknown error';
    }
    // ... handle other cases
  }
  return 'Unknown error';
}
```

---

## 5. Error Handling & Logging

### 5.1 Centralized Logging

**Issue**: `console.error` calls scattered throughout codebase (75+ instances).

**Recommendation**: Create logger utility:
```typescript
// src/lib/logger.ts
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export const logger = {
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, error, context);
    // Could also send to error tracking service (Sentry, etc.)
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, context);
  },
  // ... other levels
};
```

### 5.2 Consistent Error Messages

**Issue**: Inconsistent error message formats across API routes.

**Recommendation**: Standardize error responses:
```typescript
// src/lib/api/response.ts
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
```

---

## 6. Security Improvements

### 6.1 API Key Validation

**Issue**: No validation before saving API keys.

**Recommendation**: Add basic validation:
```typescript
// src/lib/apiKeyValidation.ts
export function validateAPIKey(model: AIModel, key: string): boolean {
  if (!key || key.trim().length === 0) return false;
  
  const minLengths: Record<AIModel, number> = {
    openai: 20,
    gemini: 20,
    'stable-diffusion': 10,
    elevenlabs: 20,
    custom: 5,
    supadata: 20,
  };
  
  return key.length >= (minLengths[model] || 10);
}
```

### 6.2 Secure Storage Consideration

**Issue**: API keys stored in localStorage (via Zustand persist).

**Recommendation**: 
- Document security implications
- Consider server-side storage for production
- Add encryption option for sensitive keys
- Add warning in UI about local storage

---

## 7. Code Quality Improvements

### 7.1 JSDoc Comments

**Issue**: Complex functions lack documentation.

**Recommendation**: Add JSDoc to complex functions:
```typescript
/**
 * Extracts meaningful content from AI API responses, removing metadata.
 * Handles JSON, base64 images, audio data URLs, and plain text.
 * 
 * @param result - Raw response string from AI API
 * @returns Clean content string (text, image URL, or audio URL)
 * 
 * @example
 * extractResponseContent('{"output": [{"content": [{"text": "Hello"}]}]}')
 * // Returns: "Hello"
 */
function extractResponseContent(result: string): string {
  // ...
}
```

### 7.2 Extract Complex Logic

**Issue**: `extractResponseContent` is 260 lines - too complex.

**Recommendation**: Split into smaller functions:
```typescript
function extractResponseContent(result: string): string {
  if (!result) return '';
  
  // Early returns for simple cases
  if (isBase64Image(result)) return convertToDataUrl(result);
  if (isAudioDataUrl(result)) return result;
  if (isImageUrl(result)) return result;
  
  // Handle JSON
  if (isJSON(result)) {
    return extractFromJSON(JSON.parse(result));
  }
  
  return result;
}

function isBase64Image(str: string): boolean {
  // ... validation logic
}

function extractFromJSON(obj: unknown): string {
  // ... recursive extraction
}
```

### 7.3 Remove Dead Code

**Issue**: Unused functions like `callClaude`, `callFalNanoBanana`, `callVeo2` in route.ts.

**Recommendation**: Remove or move to separate file if needed for future use.

---

## 8. Testing Infrastructure

### 8.1 Unit Tests

**Recommendation**: Add test files for critical functions:
```
src/lib/
  ├── __tests__/
  │   ├── workflowExecutor.test.ts
  │   ├── aiService.test.ts
  │   └── extractResponseContent.test.ts
```

### 8.2 Integration Tests

**Recommendation**: Test API routes with mock responses.

---

## 9. Performance Monitoring

### 9.1 Add Performance Tracking

**Recommendation**: Track API call durations:
```typescript
async function callOpenAI(...) {
  const startTime = performance.now();
  try {
    const result = await fetch(...);
    const duration = performance.now() - startTime;
    logger.info('OpenAI API call completed', { duration, model });
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('OpenAI API call failed', error, { duration, model });
    throw error;
  }
}
```

---

## 10. User Experience Improvements

### 10.1 Loading States

**Issue**: Some async operations lack loading indicators.

**Recommendation**: Add loading states for:
- Voice loading in ElevenLabs nodes
- Context loading
- Workflow execution progress

### 10.2 Error Messages

**Issue**: Some error messages are technical.

**Recommendation**: User-friendly error messages:
```typescript
const ERROR_MESSAGES = {
  NO_API_KEY: 'Please configure your API key in Settings',
  RATE_LIMIT: 'Rate limit exceeded. Please try again later.',
  INVALID_PROMPT: 'Please enter a prompt for this node',
  // ...
};
```

---

## 11. Specific File Recommendations

### 11.1 `src/components/nodes/AINode.tsx`

**Issues**:
- 755 lines - too large
- Multiple useEffect hooks could be combined
- Voice loading logic duplicated

**Recommendations**:
- Extract voice selector to separate component
- Extract settings panel to separate component
- Combine related useEffect hooks

### 11.2 `src/components/nodes/ResultNode.tsx`

**Issues**:
- `extractResponseContent` is too complex
- No memoization

**Recommendations**:
- Split extraction logic into smaller functions
- Add useMemo for displayResult
- Consider extracting to separate utility file

### 11.3 `src/lib/workflowExecutor.ts`

**Issues**:
- Duplicate logic between `executeNode` and `executeSingleNode`
- No error recovery mechanism

**Recommendations**:
- Extract shared logic
- Add retry mechanism for transient failures
- Add timeout handling

---

## 12. Dependency Management

### 12.1 Unused Dependencies

**Check**: Review `package.json` for unused dependencies.

### 12.2 Add Missing Utilities

**Recommendation**: Consider adding:
- `lodash-es` or `ramda` for utility functions
- `zod` for runtime validation
- `date-fns` for date handling (if needed)

---

## 13. Build & Bundle Optimization

### 13.1 Code Splitting

**Recommendation**: Lazy load heavy components:
```typescript
const WorkflowCanvas = dynamic(() => import('@/components/WorkflowCanvas'), {
  ssr: false,
});
```

### 13.2 Tree Shaking

**Recommendation**: Ensure proper tree shaking for lodash, lucide-react icons.

---

## 14. Accessibility

### 14.1 ARIA Labels

**Issue**: Missing ARIA labels on interactive elements.

**Recommendation**: Add proper ARIA attributes:
```typescript
<button
  aria-label="Delete node"
  aria-describedby="delete-help"
>
  <Trash />
</button>
```

---

## 15. Migration Priority

### High Priority (Do First)
1. ✅ Split large API route file
2. ✅ Extract duplicate prompt building logic
3. ✅ Add centralized error handling
4. ✅ Cache voice loading
5. ✅ Add API key validation

### Medium Priority
6. Extract constants
7. Add memoization
8. Improve type safety
9. Add JSDoc comments
10. Debounce API key sync

### Low Priority (Nice to Have)
11. Add tests
12. Performance monitoring
13. Accessibility improvements
14. Code splitting

---

## Implementation Notes

- All changes should maintain backward compatibility
- Test thoroughly after each refactoring
- Consider feature flags for risky changes
- Document breaking changes if any

---

## Conclusion

This codebase is well-structured overall but would benefit from:
- Better code organization (splitting large files)
- Reduced duplication
- Improved error handling
- Performance optimizations (caching, memoization)
- Better type safety

All recommended changes preserve existing functionality while improving maintainability and performance.

