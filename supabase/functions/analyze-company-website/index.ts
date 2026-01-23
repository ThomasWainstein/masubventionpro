/**
 * analyze-company-website Edge Function
 *
 * Extracts business intelligence from company websites using Mistral AI
 * GDPR-compliant French AI provider
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  createMistralCompletion,
  buildWebsiteAnalysisSystemPrompt,
  estimateTokens,
  type MistralMessage,
} from '../_shared/mistral.ts';

interface WebsiteAnalysisRequest {
  user_id: string;
  profile_id: string;
  website_url: string;
}

interface WebsiteIntelligence {
  companyDescription?: string;
  businessActivities?: string[];
  innovations?: {
    indicators: string[];
    technologies: string[];
    score: number;
  };
  sustainability?: {
    initiatives: string[];
    certifications: string[];
    score: number;
  };
  export?: {
    markets: string[];
    multilingualSite: boolean;
    score: number;
  };
  digital?: {
    technologies: string[];
    ecommerce: boolean;
    score: number;
  };
  growth?: {
    signals: string[];
    recentInvestment: boolean;
    score: number;
  };
  analysis?: {
    confidence: number;
    analysisDate: string;
    modelUsed: string;
  };
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
    const { user_id, profile_id, website_url } = await req.json() as WebsiteAnalysisRequest;

    if (!user_id || !profile_id) {
      throw new Error('user_id and profile_id are required');
    }

    if (!website_url) {
      throw new Error('website_url is required');
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(website_url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new Error('Invalid website URL');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch website content
    let websiteContent: string;
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'MaSubventionPro/2.0 (Website Analysis Bot)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      websiteContent = extractTextFromHtml(html);
    } catch (fetchError) {
      throw new Error(`Failed to fetch website: ${fetchError.message}`);
    }

    // Limit content to avoid token limits
    const maxContentLength = 12000;
    if (websiteContent.length > maxContentLength) {
      websiteContent = websiteContent.substring(0, maxContentLength) + '...';
    }

    if (websiteContent.length < 100) {
      throw new Error('Website content too short or empty');
    }

    // Build AI prompt
    const systemPrompt = buildWebsiteAnalysisSystemPrompt();
    const userPrompt = `Analyse ce contenu de site web d'entreprise et extrais les informations au format JSON demandé.

URL: ${website_url}

CONTENU DU SITE:
${websiteContent}`;

    const messages: MistralMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Call Mistral AI
    const aiResponse = await createMistralCompletion(mistralApiKey, {
      messages,
      temperature: 0.1,
      max_tokens: 2048,
    });

    const aiContent = aiResponse.choices[0]?.message?.content || '{}';

    // Parse AI response
    let intelligence: WebsiteIntelligence;
    try {
      // Extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        intelligence = JSON.parse(jsonMatch[0]);
      } else {
        intelligence = {};
      }
    } catch {
      console.error('Failed to parse AI response:', aiContent);
      intelligence = {};
    }

    // Add analysis metadata
    intelligence.analysis = {
      confidence: calculateConfidence(intelligence),
      analysisDate: new Date().toISOString(),
      modelUsed: 'mistral-small-latest',
    };

    // Update profile with website intelligence
    const { error: updateError } = await supabase
      .from('masubventionpro_profiles')
      .update({
        website_intelligence: intelligence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile_id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
    }

    // Log usage
    const inputTokens = aiResponse.usage?.prompt_tokens || estimateTokens(systemPrompt + userPrompt);
    const outputTokens = aiResponse.usage?.completion_tokens || estimateTokens(aiContent);

    // Store in compliance_events table
    try {
      await supabase.from('compliance_events').insert({
        event_type: 'website_analysis_completed',
        function_name: 'analyze-company-website',
        user_id,
        profile_id,
        input_snapshot: {
          website_url,
          content_length: websiteContent.length,
        },
        ai_output: {
          has_description: !!intelligence.companyDescription,
          innovation_score: intelligence.innovations?.score || 0,
          sustainability_score: intelligence.sustainability?.score || 0,
          export_score: intelligence.export?.score || 0,
          digital_score: intelligence.digital?.score || 0,
          growth_score: intelligence.growth?.score || 0,
          confidence: intelligence.analysis?.confidence || 0,
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

    return new Response(
      JSON.stringify({
        success: true,
        intelligence,
        processing_time_ms: Date.now() - startTime,
        tokens_used: {
          input: inputTokens,
          output: outputTokens,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Website analysis error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        processing_time_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Extract readable text from HTML
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  // Remove HTML tags but keep content
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&euro;/g, '€');

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Calculate confidence score based on extracted data
 */
function calculateConfidence(intelligence: WebsiteIntelligence): number {
  let score = 0;
  let factors = 0;

  if (intelligence.companyDescription) {
    score += intelligence.companyDescription.length > 50 ? 20 : 10;
    factors++;
  }

  if (intelligence.businessActivities?.length) {
    score += Math.min(20, intelligence.businessActivities.length * 5);
    factors++;
  }

  if (intelligence.innovations?.indicators?.length) {
    score += 15;
    factors++;
  }

  if (intelligence.sustainability?.initiatives?.length) {
    score += 15;
    factors++;
  }

  if (intelligence.digital?.technologies?.length) {
    score += 15;
    factors++;
  }

  if (intelligence.growth?.signals?.length) {
    score += 15;
    factors++;
  }

  // Normalize to 0-100
  return factors > 0 ? Math.min(100, Math.round(score)) : 0;
}
