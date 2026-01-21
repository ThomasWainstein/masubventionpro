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
 * Sector-specific keywords for better matching
 */
const SECTOR_KEYWORDS: Record<string, string[]> = {
  'agriculture': ['agricole', 'agriculteur', 'exploitation agricole', 'culture', 'elevage', 'ferme', 'agroalimentaire', 'pac', 'foncier agricole', 'semences', 'recolte'],
  'industrie': ['industriel', 'manufacture', 'production', 'usine', 'fabrication', 'transformation'],
  'commerce': ['commercial', 'vente', 'distribution', 'retail', 'magasin', 'boutique'],
  'services': ['prestation', 'conseil', 'service', 'consulting'],
  'construction': ['batiment', 'btp', 'travaux', 'immobilier', 'renovation'],
  'transport': ['logistique', 'mobilite', 'vehicule', 'livraison', 'fret'],
  'numerique': ['digital', 'tech', 'informatique', 'logiciel', 'ia', 'data'],
  'sante': ['medical', 'soin', 'hopital', 'pharma', 'biotech'],
  'tourisme': ['hotel', 'restauration', 'voyage', 'loisir', 'hebergement'],
};

/**
 * Check if a text contains sector-relevant keywords
 */
function hasSectorKeywords(text: string, sector: string): boolean {
  const sectorLower = sector.toLowerCase();
  const keywords = SECTOR_KEYWORDS[sectorLower] || [];
  const textLower = text.toLowerCase();

  // Check main sector term
  if (textLower.includes(sectorLower)) return true;

  // Check related keywords
  return keywords.some(kw => textLower.includes(kw));
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
  const fullText = `${subsidyTitle} ${subsidyDesc}`;

  // 1. Region match (30 points max)
  const subsidyRegions = subsidy.region || [];
  let hasRegionMatch = false;

  if (profile.region && subsidyRegions.includes(profile.region)) {
    score += 30;
    reasons.push(`Region: ${profile.region}`);
    hasRegionMatch = true;
  }
  if (subsidyRegions.includes('National')) {
    score += hasRegionMatch ? 5 : 15; // Less points for national if already has regional match
    reasons.push('Aide nationale');
  }

  // 2. Sector match (30 points max) - STRICTER MATCHING
  const primarySector = subsidy.primary_sector?.toLowerCase().trim() || '';
  const categories = (subsidy.categories || []).map(c => c.toLowerCase().trim()).filter(c => c.length > 0);
  let sectorMatched = false;

  // Match by profile sector with keyword validation
  if (profile.sector && !sectorMatched) {
    const sector = profile.sector.toLowerCase();

    // Check if subsidy explicitly targets this sector
    const sectorInPrimary = primarySector.length > 2 && (
      primarySector === sector ||
      primarySector.includes(sector) ||
      hasSectorKeywords(primarySector, sector)
    );

    const sectorInCategories = categories.some(c =>
      c === sector ||
      c.includes(sector) ||
      hasSectorKeywords(c, sector)
    );

    // Also check title and description for sector keywords
    const sectorInContent = hasSectorKeywords(fullText, sector);

    if (sectorInPrimary) {
      score += 30;
      reasons.push(`Secteur: ${profile.sector}`);
      sectorMatched = true;
    } else if (sectorInCategories && sectorInContent) {
      // Need both category match AND content keywords for confidence
      score += 25;
      reasons.push(`Categorie: ${profile.sector}`);
      sectorMatched = true;
    } else if (sectorInContent) {
      // Content match only - lower confidence
      score += 15;
      reasons.push('Secteur compatible');
      sectorMatched = true;
    }
  }

  // Match by NAF label (more specific than sector)
  if (profile.naf_label && !sectorMatched) {
    const nafLabel = profile.naf_label.toLowerCase();
    // Extract key terms from NAF label (e.g., "Culture de plantes" -> ["culture", "plantes"])
    const nafTerms = nafLabel.split(/[\s,]+/).filter(t => t.length > 3);

    // Check if multiple NAF terms appear in subsidy content
    const nafMatchCount = nafTerms.filter(term =>
      fullText.includes(term) ||
      categories.some(c => c.includes(term))
    ).length;

    if (nafMatchCount >= 2) {
      score += 25;
      reasons.push('Activite NAF correspondante');
      sectorMatched = true;
    } else if (nafMatchCount === 1 && primarySector.length > 2) {
      score += 15;
      reasons.push('Secteur NAF proche');
      sectorMatched = true;
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
          console.log('[Recommendations] Trying AI scoring for profile:', profile.id);
          const aiRecommendations = await fetchAIRecommendations(profile.id, accessToken);

          if (aiRecommendations && aiRecommendations.length > 0) {
            console.log('[Recommendations] AI scoring succeeded with', aiRecommendations.length, 'results');
            setRecommendations(aiRecommendations.slice(0, limit));
            setIsAIScored(true);
            setLoading(false);
            return;
          }
          console.log('[Recommendations] AI scoring returned no results, falling back to client-side');
        } else {
          console.log('[Recommendations] No access token, skipping AI scoring');
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

        // Filter out low scores - require at least 30 points for a meaningful match
        // (region match + some sector relevance)
        const filtered = scored.filter(s => s.matchScore >= 30);

        // If no good matches, show top results but with lower threshold
        const results = filtered.length > 0
          ? filtered.slice(0, limit)
          : scored.filter(s => s.matchScore >= 20).slice(0, limit);

        setRecommendations(results);
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
