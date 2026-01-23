/**
 * Shared Mistral AI Client for Supabase Edge Functions
 * GDPR-compliant French AI provider
 */

export const MISTRAL_CONFIG = {
  baseUrl: 'https://api.mistral.ai/v1',
  model: 'mistral-small-latest',
  maxTokens: 4096,
  temperature: 0.3,
};

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MistralChatRequest {
  model?: string;
  messages: MistralMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  safe_prompt?: boolean;
}

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
 * Create a Mistral chat completion (non-streaming)
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
 * Estimate token count from text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * System prompt for subsidy matching
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
 * System prompt for chat assistant
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
 * System prompt for website analysis
 */
export function buildWebsiteAnalysisSystemPrompt(): string {
  return `Tu es un expert en analyse d'entreprises. Tu dois extraire des informations structurées à partir du contenu d'un site web d'entreprise.

Analyse le contenu fourni et extrais les informations suivantes au format JSON:
{
  "companyDescription": "Description courte de l'activité de l'entreprise",
  "businessActivities": ["Liste des activités principales"],
  "innovations": {
    "indicators": ["Indicateurs d'innovation détectés"],
    "technologies": ["Technologies mentionnées"],
    "score": 0-100
  },
  "sustainability": {
    "initiatives": ["Initiatives environnementales"],
    "certifications": ["Certifications RSE/environnementales"],
    "score": 0-100
  },
  "export": {
    "markets": ["Marchés internationaux mentionnés"],
    "multilingualSite": true/false,
    "score": 0-100
  },
  "digital": {
    "technologies": ["Technologies digitales utilisées"],
    "ecommerce": true/false,
    "score": 0-100
  },
  "growth": {
    "signals": ["Signaux de croissance détectés"],
    "recentInvestment": true/false,
    "score": 0-100
  }
}

Règles:
- Réponds UNIQUEMENT avec le JSON, sans texte avant ou après
- Utilise null pour les champs où l'information n'est pas disponible
- Les scores sont de 0 à 100 (0 = pas d'indice, 100 = très fort)
- Sois factuel, ne fais pas d'hypothèses`;
}
