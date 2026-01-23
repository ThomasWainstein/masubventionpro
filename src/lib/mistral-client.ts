/**
 * Mistral AI Client Utility
 *
 * GDPR-compliant French AI provider for MaSubventionPro
 * Replaces DeepSeek for EU AI Act compliance
 *
 * @see https://docs.mistral.ai/api/
 */

// Mistral API configuration
export const MISTRAL_CONFIG = {
  baseUrl: 'https://api.mistral.ai/v1',
  model: 'mistral-small-latest', // Cost-effective, good for subsidy matching
  maxTokens: 4096,
  temperature: 0.3, // Low temperature for consistent, factual responses
};

// Available Mistral models (for reference)
export const MISTRAL_MODELS = {
  'mistral-small-latest': {
    name: 'Mistral Small',
    inputPrice: 0.10, // USD per 1M tokens
    outputPrice: 0.30,
    contextWindow: 32000,
    description: 'Cost-effective, good for most tasks',
  },
  'mistral-large-latest': {
    name: 'Mistral Large',
    inputPrice: 2.00,
    outputPrice: 6.00,
    contextWindow: 128000,
    description: 'Most capable, for complex reasoning',
  },
  'ministral-8b-latest': {
    name: 'Ministral 8B',
    inputPrice: 0.10,
    outputPrice: 0.10,
    contextWindow: 128000,
    description: 'Fast, lightweight, cost-effective',
  },
  'ministral-3b-latest': {
    name: 'Ministral 3B',
    inputPrice: 0.04,
    outputPrice: 0.04,
    contextWindow: 128000,
    description: 'Fastest, lowest cost',
  },
} as const;

export type MistralModel = keyof typeof MISTRAL_MODELS;

/**
 * Message format for Mistral chat completions
 */
export interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Mistral chat completion request
 */
export interface MistralChatRequest {
  model: MistralModel;
  messages: MistralMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  safe_prompt?: boolean; // Enable Mistral's safety guardrails
}

/**
 * Mistral chat completion response
 */
export interface MistralChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Streaming chunk format
 */
export interface MistralStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

/**
 * Create a Mistral chat completion
 *
 * @param apiKey - Mistral API key
 * @param request - Chat completion request
 * @returns Chat completion response
 */
export async function createMistralCompletion(
  apiKey: string,
  request: MistralChatRequest
): Promise<MistralChatResponse> {
  const response = await fetch(`${MISTRAL_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || MISTRAL_CONFIG.model,
      messages: request.messages,
      temperature: request.temperature ?? MISTRAL_CONFIG.temperature,
      max_tokens: request.max_tokens ?? MISTRAL_CONFIG.maxTokens,
      top_p: request.top_p,
      stream: false,
      safe_prompt: request.safe_prompt ?? true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Create a streaming Mistral chat completion
 *
 * @param apiKey - Mistral API key
 * @param request - Chat completion request
 * @returns ReadableStream of chunks
 */
export async function createMistralStreamingCompletion(
  apiKey: string,
  request: MistralChatRequest
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${MISTRAL_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || MISTRAL_CONFIG.model,
      messages: request.messages,
      temperature: request.temperature ?? MISTRAL_CONFIG.temperature,
      max_tokens: request.max_tokens ?? MISTRAL_CONFIG.maxTokens,
      top_p: request.top_p,
      stream: true,
      safe_prompt: request.safe_prompt ?? true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral API error: ${response.status} - ${error}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  return response.body;
}

/**
 * Parse SSE stream from Mistral
 *
 * @param stream - ReadableStream from Mistral API
 * @param onChunk - Callback for each parsed chunk
 * @param onDone - Callback when stream completes
 */
export async function parseMistralStream(
  stream: ReadableStream<Uint8Array>,
  onChunk: (chunk: MistralStreamChunk) => void,
  onDone?: () => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onDone?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            onDone?.();
            return;
          }

          try {
            const chunk = JSON.parse(data) as MistralStreamChunk;
            onChunk(chunk);
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Build system prompt for subsidy matching
 */
export function buildSubsidyMatchingSystemPrompt(): string {
  return `Tu es un expert en aides publiques et subventions françaises et européennes.
Tu aides les entreprises à identifier les dispositifs d'aide auxquels elles pourraient être éligibles.

Règles importantes:
- Sois précis et factuel dans tes réponses
- Cite toujours les sources officielles quand c'est possible
- Indique clairement quand tu n'es pas sûr d'une information
- Ne garantis jamais l'obtention d'une aide - l'éligibilité réelle dépend de l'organisme financeur
- Réponds en français
- Sois concis mais complet`;
}

/**
 * Build system prompt for AI chat assistant
 */
export function buildChatAssistantSystemPrompt(profileContext?: string): string {
  let prompt = `Tu es l'assistant IA de MaSubventionPro, une plateforme d'aide à la découverte de subventions.
Tu aides les utilisateurs à comprendre les aides publiques et à trouver les dispositifs adaptés à leur situation.

Règles importantes:
- Réponds toujours en français
- Sois précis et factuel
- Si tu ne connais pas une information, dis-le clairement
- Ne garantis jamais l'obtention d'une aide
- Suggère de vérifier auprès des organismes officiels pour confirmation
- Sois concis mais utile`;

  if (profileContext) {
    prompt += `\n\nContexte du profil de l'utilisateur:\n${profileContext}`;
  }

  return prompt;
}

/**
 * Estimate token count from text (approximation)
 * Mistral uses a similar tokenizer to GPT-4
 */
export function estimateMistralTokens(text: string): number {
  if (!text) return 0;
  // Rough approximation: ~4 characters per token for French text
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost for Mistral API call
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param model - Mistral model used
 * @returns Cost in USD
 */
export function calculateMistralCost(
  inputTokens: number,
  outputTokens: number,
  model: MistralModel = 'mistral-small-latest'
): number {
  const pricing = MISTRAL_MODELS[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPrice;
  return inputCost + outputCost;
}

/**
 * Type guard for checking if a model is valid
 */
export function isValidMistralModel(model: string): model is MistralModel {
  return model in MISTRAL_MODELS;
}
