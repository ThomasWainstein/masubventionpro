/**
 * enhanced-profile-conversation-stream Edge Function
 *
 * Streaming AI chat assistant using Mistral AI
 * GDPR-compliant French AI provider
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  createMistralStreamingCompletion,
  buildChatAssistantSystemPrompt,
  estimateTokens,
  type MistralMessage,
} from '../_shared/mistral.ts';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ProfileContext {
  company_name?: string;
  sector?: string;
  region?: string;
  employees?: string;
  project_types?: string[];
  certifications?: string[];
}

interface ChatRequest {
  user_id: string;
  profile_id?: string;
  profile?: ProfileContext;
  message: string;
  conversation_history?: ConversationMessage[];
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const startTime = Date.now();

  try {
    // Get API keys from environment
    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!mistralApiKey) {
      throw new Error('MISTRAL_API_KEY not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Parse request body
    const {
      user_id,
      profile_id,
      profile,
      message,
      conversation_history = [],
    } = await req.json() as ChatRequest;

    if (!user_id) {
      throw new Error('user_id is required');
    }

    if (!message) {
      throw new Error('message is required');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build profile context string
    let profileContextStr = '';
    if (profile) {
      const contextParts: string[] = [];
      if (profile.company_name) contextParts.push(`Entreprise: ${profile.company_name}`);
      if (profile.sector) contextParts.push(`Secteur: ${profile.sector}`);
      if (profile.region) contextParts.push(`Région: ${profile.region}`);
      if (profile.employees) contextParts.push(`Effectif: ${profile.employees}`);
      if (profile.project_types?.length) contextParts.push(`Projets: ${profile.project_types.join(', ')}`);
      if (profile.certifications?.length) contextParts.push(`Certifications: ${profile.certifications.join(', ')}`);
      profileContextStr = contextParts.join('\n');
    }

    // Build system prompt
    const systemPrompt = buildChatAssistantSystemPrompt(profileContextStr);

    // Build messages array
    const messages: MistralMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (limit to last 10 messages for context)
    const recentHistory = conversation_history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Create streaming response
    const stream = await createMistralStreamingCompletion(mistralApiKey, {
      messages,
      temperature: 0.4,
      max_tokens: 2048,
    });

    // Create a TransformStream to process the SSE data
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let fullResponse = '';
    let inputTokens = estimateTokens(messages.map(m => m.content).join(' '));

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              // Stream finished - log usage
              const outputTokens = estimateTokens(fullResponse);

              try {
                await supabase.from('compliance_events').insert({
                  event_type: 'ai_chat_message',
                  function_name: 'enhanced-profile-conversation-stream',
                  user_id,
                  profile_id,
                  input_snapshot: {
                    message_length: message.length,
                    history_length: conversation_history.length,
                    has_profile_context: !!profileContextStr,
                  },
                  ai_output: {
                    response_length: fullResponse.length,
                    processing_time_ms: Date.now() - startTime,
                  },
                  model_provider: 'mistral',
                  model_version: 'mistral-small-latest',
                  input_tokens: inputTokens,
                  output_tokens: outputTokens,
                });
              } catch (logError) {
                console.error('Failed to log compliance event:', logError);
              }

              // Send done signal
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                fullResponse += content;
                // Forward the chunk in SSE format
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      },
    });

    // Pipe the Mistral stream through our transform
    const responseStream = stream.pipeThrough(transformStream);

    return new Response(responseStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat stream error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
