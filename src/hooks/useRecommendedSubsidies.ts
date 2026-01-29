import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Subsidy, MaSubventionProProfile, getSubsidyTitle, getSubsidyDescription, isAssociationType, ENTITY_TYPES } from '@/types';
import { useAIUsage, estimateTokens } from './useAIUsage';
import type { AIUsageStatus } from '@/types/ai-usage';

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
  /** Skip cache and force fresh calculation */
  forceRefresh?: boolean;
}

// Cache configuration
const CACHE_KEY_PREFIX = 'masubventionpro_recommendations_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedRecommendations {
  recommendations: ScoredSubsidy[];
  timestamp: number;
  profileId: string;
  isAIScored: boolean;
}

/**
 * Get cached recommendations from sessionStorage
 */
function getCachedRecommendations(profileId: string): CachedRecommendations | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY_PREFIX + profileId);
    if (!cached) return null;

    const data: CachedRecommendations = JSON.parse(cached);
    const age = Date.now() - data.timestamp;

    // Check if cache is still valid
    if (age > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY_PREFIX + profileId);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Save recommendations to sessionStorage cache
 */
function setCachedRecommendations(
  profileId: string,
  recommendations: ScoredSubsidy[],
  isAIScored: boolean
): void {
  try {
    const data: CachedRecommendations = {
      recommendations,
      timestamp: Date.now(),
      profileId,
      isAIScored,
    };
    sessionStorage.setItem(CACHE_KEY_PREFIX + profileId, JSON.stringify(data));
  } catch {
    // sessionStorage might be full or disabled - ignore
  }
}

interface UseRecommendedSubsidiesReturn {
  recommendations: ScoredSubsidy[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Whether AI scoring was used (vs client-side fallback) */
  isAIScored: boolean;
  /** AI usage status for tracking limits */
  usageStatus: AIUsageStatus | null;
}

const V5_MATCHER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/v5-hybrid-calculate-matches`;

/**
 * V5 Match result from edge function
 */
interface V5Match {
  subsidy_id: string;
  llm_score: number;
  sector_fit: number;
  project_fit: number;
  eligibility_score: number;
  explanation: string;
  concerns: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Fetch AI-powered recommendations from V5 hybrid matcher
 * Uses profile_table: 'masubventionpro_profiles' to specify our table
 */
async function fetchAIRecommendations(
  profileId: string,
  accessToken: string,
  limit: number = 50
): Promise<ScoredSubsidy[] | null> {
  try {
    console.log('[V5 Matcher] Calling edge function for profile:', profileId, 'limit:', limit);

    const response = await fetch(V5_MATCHER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        // Use new opaque publishable key format (legacy keys are disabled)
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        profile_id: profileId,
        profile_table: 'masubventionpro_profiles', // V5.9: Use masubventionpro table
        skip_llm: false, // Enable DeepSeek LLM scoring for better match quality
        trigger_async_llm: false, // Don't queue for background LLM
        force_refresh: false,
        limit: limit, // Pass limit to edge function
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[V5 Matcher] Request failed:', response.status, errorText);
      return null;
    }

    const result = await response.json();

    if (!result.matches || result.matches.length === 0) {
      console.log('[V5 Matcher] No matches returned');
      return null;
    }

    console.log(`[V5 Matcher] Got ${result.matches.length} matches (version: ${result.version})`);

    // Fetch full subsidy details for the matched IDs
    const subsidyIds = result.matches.map((m: V5Match) => m.subsidy_id);
    const { data: subsidies, error: subsidyError } = await supabase
      .from('subsidies')
      .select(SUBSIDY_COLUMNS)
      .in('id', subsidyIds);

    if (subsidyError || !subsidies) {
      console.warn('[V5 Matcher] Failed to fetch subsidy details:', subsidyError);
      return null;
    }

    // Create a map for quick lookup
    const subsidyMap = new Map(subsidies.map(s => [s.id, s]));

    // Map V5 matches to ScoredSubsidy format
    const scored: ScoredSubsidy[] = result.matches
      .map((match: V5Match) => {
        const subsidy = subsidyMap.get(match.subsidy_id);
        if (!subsidy) return null;

        // Build match reasons from V5 scores
        const reasons: string[] = [];
        if (match.sector_fit >= 70) reasons.push('Secteur excellent');
        else if (match.sector_fit >= 50) reasons.push('Secteur compatible');
        if (match.project_fit >= 70) reasons.push('Projet idéal');
        else if (match.project_fit >= 50) reasons.push('Projet adapté');
        if (match.eligibility_score >= 70) reasons.push('Éligibilité forte');
        if (match.confidence === 'high') reasons.push('Confiance élevée');

        return {
          ...subsidy,
          matchScore: Math.round(match.llm_score),
          matchReasons: reasons.length > 0 ? reasons : ['Recommandation IA'],
          successProbability: match.llm_score,
          similarityScore: match.sector_fit,
          marketDensityScore: match.eligibility_score,
          competitiveDensity: match.confidence,
        } as ScoredSubsidy;
      })
      .filter((s: ScoredSubsidy | null): s is ScoredSubsidy => s !== null);

    return scored;
  } catch (err) {
    console.warn('[V5 Matcher] Error:', err);
    return null;
  }
}

/**
 * Sector-specific keywords for better matching
 */
const SECTOR_KEYWORDS: Record<string, string[]> = {
  'agriculture': ['agricole', 'agriculteur', 'exploitation agricole', 'culture', 'elevage', 'ferme', 'agroalimentaire', 'pac', 'foncier agricole', 'semences', 'recolte', 'biomasse', 'biosource', 'carbone', 'decarbonation', 'environnement', 'durable', 'plantation', 'hectare'],
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
 * Sector-specific exclusion keywords - subsidies containing these are likely irrelevant
 */
const SECTOR_EXCLUSIONS: Record<string, string[]> = {
  'agriculture': ['automobile', 'amiante', 'garage', 'carrosserie', 'mecanique auto', 'taxi', 'vtc'],
  'industrie': [],
  'commerce': [],
  'services': [],
  'construction': [],
  'transport': [],
  'numerique': [],
  'sante': [],
  'tourisme': [],
};

/**
 * Normalize sector name for keyword lookup
 * Handles formats like "Agriculture / Agroalimentaire" -> "agriculture"
 */
function normalizeSector(sector: string): string {
  const normalized = sector.toLowerCase().trim();
  // Extract first word before slash or parenthesis
  const match = normalized.match(/^([a-zàâäéèêëïîôùûüç]+)/);
  return match ? match[1] : normalized;
}

/**
 * Check if a text contains sector-relevant keywords
 */
function hasSectorKeywords(text: string, sector: string): boolean {
  const normalizedSector = normalizeSector(sector);
  const keywords = SECTOR_KEYWORDS[normalizedSector] || [];
  const textLower = text.toLowerCase();

  // Check main sector term
  if (textLower.includes(normalizedSector)) return true;

  // Check related keywords
  return keywords.some(kw => textLower.includes(kw));
}

/**
 * Check if a text contains exclusion keywords for a sector
 * Returns true if the subsidy should be excluded/penalized
 */
function hasExclusionKeywords(text: string, sector: string): boolean {
  const normalizedSector = normalizeSector(sector);
  const exclusions = SECTOR_EXCLUSIONS[normalizedSector] || [];
  const textLower = text.toLowerCase();

  return exclusions.some(kw => textLower.includes(kw));
}

/**
 * Keywords that indicate a subsidy is specifically for associations
 */
const ASSOCIATION_KEYWORDS = [
  'association',
  'associations',
  'associatif',
  'associative',
  'loi 1901',
  'organisme à but non lucratif',
  'organisation non gouvernementale',
  'ong',
  'fondation',
  'fondations',
  'coopérative',
  'coopératives',
  'économie sociale et solidaire',
  'ess',
  'utilité sociale',
  'intérêt général',
];

/**
 * Keywords that indicate a subsidy is specifically for companies (excluding associations)
 */
const COMPANY_ONLY_KEYWORDS = [
  'entreprise uniquement',
  'sociétés commerciales',
  'hors associations',
  'hors asso',
  'entreprises commerciales',
  'sociétés à but lucratif',
];

/**
 * Extract eligible entity types from subsidy data
 * Analyzes title and description to determine eligibility
 */
function extractEligibleEntityTypes(subsidy: Subsidy): {
  entityTypes: string[];
  associationEligible: boolean;
  companyOnly: boolean;
} {
  const entityTypes: Set<string> = new Set();
  let associationEligible = false;
  let companyOnly = false;

  // Combine all relevant text fields for analysis
  const textToAnalyze = [
    getSubsidyTitle(subsidy),
    getSubsidyDescription(subsidy),
  ].join(' ').toLowerCase();

  // Analyze text fields for entity type mentions
  for (const entityType of ENTITY_TYPES) {
    for (const keyword of entityType.keywords) {
      if (textToAnalyze.includes(keyword)) {
        entityTypes.add(entityType.value);
        if (entityType.value === 'association') {
          associationEligible = true;
        }
        break; // Found one keyword, move to next entity type
      }
    }
  }

  // Check for explicit association keywords
  if (ASSOCIATION_KEYWORDS.some(kw => textToAnalyze.includes(kw))) {
    entityTypes.add('association');
    associationEligible = true;
  }

  // Check if company-only (excludes associations)
  if (COMPANY_ONLY_KEYWORDS.some(kw => textToAnalyze.includes(kw))) {
    companyOnly = true;
    entityTypes.delete('association');
    associationEligible = false;
  }

  // If no entity types detected, assume general eligibility (entreprise + association)
  if (entityTypes.size === 0) {
    entityTypes.add('entreprise');
    // Don't auto-add association - be conservative
  }

  return {
    entityTypes: Array.from(entityTypes),
    associationEligible,
    companyOnly,
  };
}

/**
 * Check if a subsidy is compatible with a profile's entity type
 * Returns { compatible: boolean, penalty: number, reason: string }
 */
function checkEntityTypeCompatibility(
  subsidy: Subsidy,
  profile: MaSubventionProProfile
): { compatible: boolean; penalty: number; reason: string } {
  const isProfileAssociation = isAssociationType(profile.legal_form);
  const { entityTypes, associationEligible, companyOnly } = extractEligibleEntityTypes(subsidy);

  // Association profile checking for eligibility
  if (isProfileAssociation) {
    // If subsidy is explicitly company-only, exclude it
    if (companyOnly) {
      return {
        compatible: false,
        penalty: -100,
        reason: 'Réservé aux entreprises commerciales',
      };
    }

    // If subsidy explicitly mentions associations, it's a great match
    if (associationEligible || entityTypes.includes('association')) {
      return {
        compatible: true,
        penalty: 0, // Bonus will be added in score calculation
        reason: 'Ouvert aux associations',
      };
    }

    // If subsidy only mentions entreprise without excluding associations, uncertain
    if (entityTypes.includes('entreprise') && entityTypes.length === 1) {
      return {
        compatible: true, // Don't exclude, but penalize
        penalty: -15,
        reason: 'Principalement pour entreprises',
      };
    }

    // General subsidy, likely compatible
    return {
      compatible: true,
      penalty: 0,
      reason: '',
    };
  }

  // Company profile (non-association)
  // Check if subsidy is association-only
  if (entityTypes.length === 1 && entityTypes.includes('association')) {
    return {
      compatible: false,
      penalty: -100,
      reason: 'Réservé aux associations',
    };
  }

  // Company profile is generally compatible
  return {
    compatible: true,
    penalty: 0,
    reason: '',
  };
}

/**
 * Calculate match score between profile and subsidy
 * Exported for use in landing page simulation
 */
export function calculateMatchScore(
  subsidy: Subsidy,
  profile: MaSubventionProProfile
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const subsidyTitle = getSubsidyTitle(subsidy).toLowerCase();
  const subsidyDesc = getSubsidyDescription(subsidy).toLowerCase();
  const fullText = `${subsidyTitle} ${subsidyDesc}`;

  // 0a. Check entity type compatibility (association vs entreprise)
  const entityCompatibility = checkEntityTypeCompatibility(subsidy, profile);
  if (!entityCompatibility.compatible) {
    // Completely incompatible entity type - exclude
    return { score: -100, reasons: [entityCompatibility.reason] };
  }
  // Apply any penalty for uncertain compatibility
  score += entityCompatibility.penalty;
  if (entityCompatibility.reason && entityCompatibility.penalty === 0 && isAssociationType(profile.legal_form)) {
    // Add positive reason for association-compatible subsidies
    reasons.push(entityCompatibility.reason);
  }

  // 0b. Check for sector exclusions - heavily penalize irrelevant subsidies
  if (profile.sector && hasExclusionKeywords(fullText, profile.sector)) {
    // Return very low score for subsidies that are clearly not relevant
    return { score: -50, reasons: ['Secteur non pertinent'] };
  }

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
      reasons.push(`Catégorie: ${profile.sector}`);
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
      reasons.push('Activité NAF correspondante');
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
        reasons.push('Activité export');
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
      reasons.push('À candidater bientôt');
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
  const { limit = 10, enableScoring = true, useAIScoring = true, forceRefresh = false } = options;

  const [recommendations, setRecommendations] = useState<ScoredSubsidy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAIScored, setIsAIScored] = useState(false);

  // AI usage tracking
  const { checkUsage, logUsage, status: usageStatus } = useAIUsage();

  // Prevent duplicate fetches - track which profile we're currently fetching
  const fetchingProfileRef = useRef<string | null>(null);
  const lastFetchedProfileRef = useRef<string | null>(null);

  const fetchRecommendations = useCallback(async (skipCache = false) => {
    if (!profile) {
      setRecommendations([]);
      return;
    }

    // Prevent duplicate concurrent fetches for the same profile
    if (fetchingProfileRef.current === profile.id) {
      console.log('[Recommendations] Already fetching for profile, skipping duplicate call');
      return;
    }

    // Skip if we already fetched for this profile (unless cache bypass requested)
    if (!skipCache && lastFetchedProfileRef.current === profile.id) {
      console.log('[Recommendations] Already fetched for this profile, skipping');
      return;
    }

    // Check cache first (unless force refresh requested)
    if (!skipCache && !forceRefresh && profile.id) {
      const cached = getCachedRecommendations(profile.id);
      if (cached) {
        console.log('[Recommendations] Using cached data', {
          age: Math.round((Date.now() - cached.timestamp) / 1000) + 's',
          count: cached.recommendations.length,
          isAIScored: cached.isAIScored,
        });
        setRecommendations(cached.recommendations.slice(0, limit));
        setIsAIScored(cached.isAIScored);
        lastFetchedProfileRef.current = profile.id;
        return;
      }
    }

    // Mark as fetching
    fetchingProfileRef.current = profile.id;
    setLoading(true);
    setError(null);
    setIsAIScored(false);

    try {
      // Try AI-powered recommendations first if enabled
      if (useAIScoring && profile.id) {
        // Check AI usage before proceeding
        const usageCheck = await checkUsage();
        if (!usageCheck.allowed) {
          console.log('[Recommendations] AI usage blocked:', usageCheck.error);
          // Fall through to client-side scoring
        } else {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;

          if (accessToken) {
            console.log('[Recommendations] Trying AI scoring for profile:', profile.id);
            const aiRecommendations = await fetchAIRecommendations(profile.id, accessToken, limit);

            if (aiRecommendations && aiRecommendations.length > 0) {
              console.log('[Recommendations] AI scoring succeeded with', aiRecommendations.length, 'results');

              // Filter out expired subsidies and irrelevant ones based on sector exclusions
              const todayDate = new Date().toISOString().split('T')[0];
              const filteredAI = aiRecommendations.filter(subsidy => {
                // Filter out expired subsidies
                if (subsidy.deadline && subsidy.deadline < todayDate) {
                  console.log('[Recommendations] Excluding expired AI result:', getSubsidyTitle(subsidy).substring(0, 50), 'deadline:', subsidy.deadline);
                  return false;
                }

                // Filter out irrelevant sectors
                if (profile.sector) {
                  const subsidyTitle = getSubsidyTitle(subsidy).toLowerCase();
                  const subsidyDesc = getSubsidyDescription(subsidy).toLowerCase();
                  const fullText = `${subsidyTitle} ${subsidyDesc}`;
                  const isExcluded = hasExclusionKeywords(fullText, profile.sector);
                  if (isExcluded) {
                    console.log('[Recommendations] Excluding AI result:', subsidyTitle.substring(0, 50));
                    return false;
                  }
                }
                return true;
              });

              console.log('[Recommendations] After exclusion filter:', filteredAI.length, 'results');

              // Log AI usage (estimate tokens from profile and results)
              const inputTokens = estimateTokens(JSON.stringify(profile));
              const outputTokens = estimateTokens(JSON.stringify(aiRecommendations));
              logUsage({
                function_name: 'v5-hybrid-calculate-matches',
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                profile_id: profile.id,
                success: true,
              });

              // If AI returned fewer results than limit, supplement with client-side scoring
              if (filteredAI.length < limit) {
                console.log('[Recommendations] AI returned fewer than limit, supplementing with client-side scoring');
                const aiSubsidyIds = new Set(filteredAI.map(s => s.id));
                const todayStr = new Date().toISOString().split('T')[0];

                // Fetch more subsidies for client-side scoring
                // Note: Deadline filtering is done client-side to avoid PostgREST 500 error with or() filter
                let supplementQuery = supabase
                  .from('subsidies')
                  .select(SUBSIDY_COLUMNS)
                  .eq('is_active', true);

                if (profile.region) {
                  supplementQuery = supplementQuery.or(`region.cs.{${profile.region}},region.cs.{National}`);
                }

                supplementQuery = supplementQuery
                  .order('deadline', { ascending: true, nullsFirst: false })
                  .limit(150); // Fetch more to account for expired subsidies filtered out client-side

                const { data: rawSupplementData } = await supplementQuery;
                // Filter out expired subsidies client-side
                const supplementData = (rawSupplementData || []).filter((s: any) =>
                  s.deadline === null || s.deadline >= todayStr
                ).slice(0, 100);

                console.log('[Recommendations] Supplement query returned', supplementData?.length || 0, 'subsidies');

                if (supplementData && supplementData.length > 0) {
                  // Score and filter supplementary subsidies
                  const allSupplementScored = (supplementData as Subsidy[])
                    .filter(s => !aiSubsidyIds.has(s.id)) // Exclude already in AI results
                    .map(subsidy => {
                      const { score, reasons } = calculateMatchScore(subsidy, profile);
                      return { ...subsidy, matchScore: score, matchReasons: reasons } as ScoredSubsidy;
                    });

                  // Debug: show distribution of scores
                  const scoreDistribution = {
                    negative: allSupplementScored.filter(s => s.matchScore < 0).length,
                    below10: allSupplementScored.filter(s => s.matchScore >= 0 && s.matchScore < 10).length,
                    from10to15: allSupplementScored.filter(s => s.matchScore >= 10 && s.matchScore < 15).length,
                    from15to30: allSupplementScored.filter(s => s.matchScore >= 15 && s.matchScore < 30).length,
                    above30: allSupplementScored.filter(s => s.matchScore >= 30).length,
                  };
                  console.log('[Recommendations] Supplement score distribution:', scoreDistribution);

                  // Lower threshold to 10 for supplements to get more variety
                  const supplementScored = allSupplementScored
                    .filter(s => s.matchScore >= 10)
                    .sort((a, b) => b.matchScore - a.matchScore);

                  // Combine AI results with supplementary results
                  const combined = [...filteredAI, ...supplementScored].slice(0, limit);
                  console.log('[Recommendations] Combined results:', combined.length, '(AI:', filteredAI.length, '+ supplement:', supplementScored.length, ')');

                  setCachedRecommendations(profile.id, combined, true);
                  setRecommendations(combined);
                  setIsAIScored(true);
                  setLoading(false);
                  return;
                }
              }

              // Cache the filtered results
              setCachedRecommendations(profile.id, filteredAI, true);
              setRecommendations(filteredAI.slice(0, limit));
              setIsAIScored(true);
              setLoading(false);
              return;
            }
            console.log('[Recommendations] AI scoring returned no results, falling back to client-side');
          } else {
            console.log('[Recommendations] No access token, skipping AI scoring');
          }
        }
      }

      // Fallback to client-side scoring
      // Note: Deadline filtering is done client-side to avoid PostgREST 500 error with or() filter
      const today = new Date().toISOString().split('T')[0];
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
        .limit(enableScoring ? 150 : limit + 50); // Fetch more to account for expired subsidies filtered out client-side

      const { data: rawData, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      // Filter out expired subsidies client-side
      let subsidies = ((rawData || []) as Subsidy[]).filter(s =>
        s.deadline === null || s.deadline >= today
      ).slice(0, enableScoring ? 100 : limit);

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

        // Debug: log top and excluded subsidies
        console.log('[Recommendations] Profile sector:', profile.sector);
        console.log('[Recommendations] Top 10 scored:', scored.slice(0, 10).map(s => ({
          title: getSubsidyTitle(s).substring(0, 50),
          score: s.matchScore,
          reasons: s.matchReasons,
        })));
        const excluded = scored.filter(s => s.matchScore < 0);
        if (excluded.length > 0) {
          console.log('[Recommendations] Excluded (negative score):', excluded.map(s => getSubsidyTitle(s).substring(0, 50)));
        }

        // Filter out low/negative scores - require at least 15 points for inclusion
        // Negative scores indicate excluded subsidies (irrelevant sectors like automobile for agriculture)
        const filtered = scored.filter(s => s.matchScore >= 15);

        // If no good matches, show top results but with minimal threshold (still excludes negative)
        const results = filtered.length > 0
          ? filtered.slice(0, limit)
          : scored.filter(s => s.matchScore >= 10).slice(0, limit);

        // Cache client-side results too
        if (profile.id) {
          setCachedRecommendations(profile.id, results, false);
        }
        setRecommendations(results);
      } else {
        // No scoring, just return raw results
        const results = subsidies.slice(0, limit).map(s => ({
          ...s,
          matchScore: 0,
          matchReasons: [],
        }));
        if (profile.id) {
          setCachedRecommendations(profile.id, results, false);
        }
        setRecommendations(results);
      }
    } catch (err: any) {
      console.error('Recommendation fetch error:', err);
      setError(err.message || 'Erreur lors du chargement des recommandations');
      setRecommendations([]);
    } finally {
      setLoading(false);
      // Clear fetching flag and mark as fetched
      fetchingProfileRef.current = null;
      if (profile?.id) {
        lastFetchedProfileRef.current = profile.id;
      }
    }
  }, [profile, limit, enableScoring, useAIScoring, forceRefresh, checkUsage, logUsage]);

  // Reset lastFetched when profile ID changes (allows new fetch for new profile)
  useEffect(() => {
    if (profile?.id !== lastFetchedProfileRef.current) {
      lastFetchedProfileRef.current = null;
    }
  }, [profile?.id]);

  // Fetch on mount and when profile ID changes
  useEffect(() => {
    if (profile?.id) {
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]); // Only re-fetch when profile ID changes, not on every callback recreation

  // Refresh function that bypasses cache
  const refresh = useCallback(() => {
    return fetchRecommendations(true);
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refresh,
    isAIScored,
    usageStatus,
  };
}

export default useRecommendedSubsidies;
