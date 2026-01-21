import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Subsidy, MaSubventionProProfile, getSubsidyTitle, getSubsidyDescription } from '@/types';

/**
 * Subsidy with match score for ranking
 */
export interface ScoredSubsidy extends Subsidy {
  matchScore: number;
  matchReasons: string[];
  // V5 AI scoring fields (when available)
  successProbability?: number;
  similarityScore?: number;
  marketDensityScore?: number;
  timingScore?: number;
  competitiveDensity?: string;
}

/**
 * V5 Hybrid Matcher - Profile-based subsidy recommendations
 *
 * Matching criteria (weighted):
 * - Region match (30%): User's region or National
 * - Sector match (25%): NAF code, sector, or primary_sector
 * - Project types match (20%): User's project interests vs categories
 * - Website intelligence (15%): Innovation, sustainability, export scores
 * - Timing (10%): Deadline proximity (prefer upcoming but not too urgent)
 */

const SUBSIDY_COLUMNS = `
  id,
  title,
  description,
  agency,
  region,
  deadline,
  amount_min,
  amount_max,
  funding_type,
  categories,
  primary_sector,
  keywords,
  application_url,
  source_url,
  is_active
`;

interface UseRecommendedSubsidiesOptions {
  limit?: number;
  enableScoring?: boolean;
  /** Use AI-powered scoring via edge function (requires auth) */
  useAIScoring?: boolean;
}

interface UseRecommendedSubsidiesReturn {
  recommendations: ScoredSubsidy[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Whether AI scoring was used (vs client-side fallback) */
  isAIScored: boolean;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhanced-profile-conversation-stream`;

/**
 * Fetch AI-powered recommendations from edge function
 */
async function fetchAIRecommendations(
  profileId: string,
  accessToken: string
): Promise<ScoredSubsidy[] | null> {
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        message: 'Quelles sont les meilleures aides pour mon profil? Donne-moi les top recommandations.',
        profileId,
        conversationHistory: [],
        sessionId: null,
        userTier: 'business',
      }),
    });

    if (!response.ok) {
      console.warn('AI recommendations fetch failed:', response.status);
      return null;
    }

    const reader = response.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let profileMatches: ScoredSubsidy[] | null = null;

    // Read stream to get intelligence data
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'done' && parsed.intelligence?.profileMatches?.matches) {
              // Extract profileMatches from AI response
              const matches = parsed.intelligence.profileMatches.matches;
              profileMatches = matches.map((match: any): ScoredSubsidy => ({
                id: match.id,
                title: match.title,
                description: null,
                agency: match.organization || null,
                region: [],
                deadline: match.deadline || null,
                start_date: null,
                amount_min: null,
                amount_max: match.amountMax || null,
                funding_type: match.fundingType || null,
                categories: [],
                primary_sector: null,
                keywords: null,
                application_url: null,
                source_url: null,
                quality_score: null,
                status: null,
                is_active: true,
                created_at: null,
                updated_at: null,
                matchScore: Math.round(match.successProbability || 0),
                matchReasons: match.successReasons || [],
                successProbability: match.successProbability,
              }));
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    return profileMatches;
  } catch (err) {
    console.warn('AI recommendations error:', err);
    return null;
  }
}

/**
 * Calculate match score between profile and subsidy
 */
function calculateMatchScore(
  subsidy: Subsidy,
  profile: MaSubventionProProfile
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const subsidyTitle = getSubsidyTitle(subsidy).toLowerCase();
  const subsidyDesc = getSubsidyDescription(subsidy).toLowerCase();

  // 1. Region match (30 points max)
  const subsidyRegions = subsidy.region || [];
  if (subsidyRegions.includes('National')) {
    score += 20;
    reasons.push('Aide nationale');
  }
  if (profile.region && subsidyRegions.includes(profile.region)) {
    score += 30;
    reasons.push(`Region: ${profile.region}`);
  }

  // 2. Sector match (25 points max)
  const primarySector = subsidy.primary_sector?.toLowerCase() || '';
  const categories = (subsidy.categories || []).map(c => c.toLowerCase());

  // Match by NAF code/label
  if (profile.naf_label) {
    const nafLabel = profile.naf_label.toLowerCase();
    if (primarySector.includes(nafLabel) || nafLabel.includes(primarySector)) {
      score += 25;
      reasons.push('Secteur NAF correspondant');
    } else if (categories.some(c => nafLabel.includes(c) || c.includes(nafLabel))) {
      score += 20;
      reasons.push('Categorie sectorielle');
    }
  }

  // Match by sector
  if (profile.sector) {
    const sector = profile.sector.toLowerCase();
    if (primarySector.includes(sector) || sector.includes(primarySector)) {
      score += 20;
      reasons.push(`Secteur: ${profile.sector}`);
    } else if (categories.some(c => sector.includes(c) || c.includes(sector))) {
      score += 15;
      reasons.push('Secteur compatible');
    }
  }

  // 3. Project types match (20 points max)
  const projectTypes = profile.project_types || [];
  const projectTypeMapping: Record<string, string[]> = {
    'innovation': ['innovation', 'r&d', 'recherche', 'développement', 'innov'],
    'export': ['export', 'international', 'etranger', 'commerce exterieur'],
    'transition-eco': ['ecologique', 'environnement', 'durable', 'vert', 'carbone', 'energie'],
    'numerique': ['numerique', 'digital', 'tech', 'informatique', 'cyber'],
    'emploi': ['emploi', 'formation', 'recrutement', 'competences', 'apprentissage'],
    'creation': ['creation', 'reprise', 'startup', 'entrepreneur', 'jeune entreprise'],
    'investissement': ['investissement', 'equipement', 'materiel', 'immobilier'],
    'tresorerie': ['tresorerie', 'bfr', 'financement', 'pret'],
  };

  let projectMatchCount = 0;
  projectTypes.forEach(pt => {
    const keywords = projectTypeMapping[pt] || [pt];
    const hasMatch = keywords.some(kw =>
      subsidyTitle.includes(kw) ||
      subsidyDesc.includes(kw) ||
      categories.some(c => c.includes(kw))
    );
    if (hasMatch) {
      projectMatchCount++;
    }
  });

  if (projectMatchCount > 0) {
    const projectScore = Math.min(20, projectMatchCount * 10);
    score += projectScore;
    reasons.push(`${projectMatchCount} type(s) de projet`);
  }

  // 4. Website intelligence bonus (15 points max)
  const intel = profile.website_intelligence;
  if (intel) {
    // Innovation match
    if (intel.innovations?.score && intel.innovations.score > 0.5) {
      if (subsidyTitle.includes('innovation') || subsidyDesc.includes('r&d') ||
          categories.some(c => c.includes('innovation'))) {
        score += 5;
        reasons.push('Profil innovant');
      }
    }

    // Sustainability match
    if (intel.sustainability?.score && intel.sustainability.score > 0.5) {
      if (subsidyTitle.includes('ecolog') || subsidyTitle.includes('durable') ||
          subsidyDesc.includes('environnement') || categories.some(c => c.includes('vert'))) {
        score += 5;
        reasons.push('Engagement durable');
      }
    }

    // Export match
    if (intel.export?.score && intel.export.score > 0.5) {
      if (subsidyTitle.includes('export') || subsidyTitle.includes('international') ||
          categories.some(c => c.includes('export'))) {
        score += 5;
        reasons.push('Activite export');
      }
    }
  }

  // 5. Timing score (10 points max)
  if (subsidy.deadline) {
    const deadline = new Date(subsidy.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDeadline > 30 && daysUntilDeadline <= 180) {
      // Sweet spot: 1-6 months away
      score += 10;
      reasons.push('Deadline favorable');
    } else if (daysUntilDeadline > 14 && daysUntilDeadline <= 30) {
      // Coming soon but still time
      score += 7;
      reasons.push('A candidater bientot');
    } else if (daysUntilDeadline > 180) {
      // Far away
      score += 5;
    }
    // Very urgent (<14 days) gets no bonus
  } else {
    // Ongoing programs (no deadline) are good
    score += 8;
    reasons.push('Programme permanent');
  }

  return { score, reasons };
}

export function useRecommendedSubsidies(
  profile: MaSubventionProProfile | null,
  options: UseRecommendedSubsidiesOptions = {}
): UseRecommendedSubsidiesReturn {
  const { limit = 10, enableScoring = true, useAIScoring = true } = options;

  const [recommendations, setRecommendations] = useState<ScoredSubsidy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAIScored, setIsAIScored] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!profile) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    setError(null);
    setIsAIScored(false);

    try {
      // Try AI-powered recommendations first if enabled
      if (useAIScoring && profile.id) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (accessToken) {
          const aiRecommendations = await fetchAIRecommendations(profile.id, accessToken);

          if (aiRecommendations && aiRecommendations.length > 0) {
            setRecommendations(aiRecommendations.slice(0, limit));
            setIsAIScored(true);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback to client-side scoring
      let query = supabase
        .from('subsidies')
        .select(SUBSIDY_COLUMNS)
        .eq('is_active', true);

      // Build region filter (user's region OR National)
      if (profile.region) {
        query = query.or(`region.cs.{${profile.region}},region.cs.{National}`);
      }

      // Order by deadline (upcoming first) and amount (higher first)
      query = query
        .order('deadline', { ascending: true, nullsFirst: false })
        .order('amount_max', { ascending: false, nullsFirst: true })
        .limit(enableScoring ? 50 : limit);

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      let subsidies = (data || []) as Subsidy[];

      if (enableScoring && subsidies.length > 0) {
        // Score and rank subsidies
        const scored: ScoredSubsidy[] = subsidies.map(subsidy => {
          const { score, reasons } = calculateMatchScore(subsidy, profile);
          return {
            ...subsidy,
            matchScore: score,
            matchReasons: reasons,
          };
        });

        // Sort by score (descending) and take top results
        scored.sort((a, b) => b.matchScore - a.matchScore);

        // Filter out very low scores (less than 15 points = basically no match)
        const filtered = scored.filter(s => s.matchScore >= 15);

        setRecommendations(filtered.slice(0, limit));
      } else {
        // No scoring, just return raw results
        setRecommendations(subsidies.slice(0, limit).map(s => ({
          ...s,
          matchScore: 0,
          matchReasons: [],
        })));
      }
    } catch (err: any) {
      console.error('Recommendation fetch error:', err);
      setError(err.message || 'Erreur lors du chargement des recommandations');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [profile, limit, enableScoring, useAIScoring]);

  // Fetch on mount and when profile changes
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refresh: fetchRecommendations,
    isAIScored,
  };
}

export default useRecommendedSubsidies;
