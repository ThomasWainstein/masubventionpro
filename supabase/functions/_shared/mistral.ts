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
 * Create a Mistral chat completion with retry/backoff for rate limits
 * Automatically retries on 429 (rate limit) errors with exponential backoff
 */
export async function createMistralCompletionWithRetry(
  apiKey: string,
  request: MistralChatRequest,
  maxRetries: number = 3
): Promise<MistralChatResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await createMistralCompletion(apiKey, request);
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || '';

      // Only retry on rate limit (429) or server errors (5xx)
      if (errorMessage.includes('429') || errorMessage.includes('529')) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`[Mistral] Rate limited, retry ${attempt + 1}/${maxRetries} in ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }

      // 503 Service Unavailable - also retry
      if (errorMessage.includes('503')) {
        const backoffMs = Math.min(2000 * Math.pow(2, attempt), 15000);
        console.log(`[Mistral] Service unavailable, retry ${attempt + 1}/${maxRetries} in ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }

      // Non-retryable error - throw immediately
      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
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
  return `Tu es un expert en éligibilité aux aides publiques françaises. Ta mission est d'évaluer la correspondance entre un profil d'entreprise et des subventions.

CRITÈRES DE MATCHING (par ordre d'importance):

1. ÉLIGIBILITÉ LÉGALE (bloquant):
   - legal_entities: L'entreprise doit correspondre aux types éligibles
   - Ex: Si subsidy.legal_entities = ["PME", "ETI"], une grande entreprise n'est PAS éligible

2. ZONE GÉOGRAPHIQUE (important):
   - La région/département de l'entreprise doit être dans subsidy.region
   - "National" ou région vide = toutes régions éligibles

3. SECTEUR D'ACTIVITÉ (important):
   - Le secteur de l'entreprise doit correspondre à subsidy.primary_sector ou categories
   - Certaines aides sont multi-secteurs (is_universal_sector = true)

4. TAILLE DE L'ENTREPRISE (si spécifié):
   - Vérifier employees vs restrictions de taille dans eligibility_criteria
   - TPE < 10, PME < 250, ETI < 5000, GE >= 5000

5. PROJET/OBJECTIF (contextuel):
   - Les project_types de l'entreprise doivent correspondre au funding_type de l'aide

SCORING (0-100):
- 90-100: Éligibilité quasi-certaine (tous critères remplis)
- 70-89: Forte probabilité (critères majeurs remplis, mineurs incertains)
- 50-69: Possible (certains critères manquants mais pas bloquants)
- 30-49: Faible (critères importants manquants)
- 0-29: Non éligible (critère bloquant non rempli)

RÈGLES STRICTES:
- Ne JAMAIS scorer > 50 si legal_entities ne correspond pas
- Ne JAMAIS scorer > 70 si la région ne correspond pas (sauf aide nationale)
- Toujours expliquer les critères manquants
- En cas de doute sur un critère, le mettre dans missing_criteria`;
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
