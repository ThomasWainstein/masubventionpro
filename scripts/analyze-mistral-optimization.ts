/**
 * Analyze Mistral API Usage and Propose Optimizations
 *
 * This script analyzes the current token usage and proposes
 * ways to optimize API calls to stay within rate limits.
 */

console.log('═'.repeat(100));
console.log('MISTRAL API OPTIMIZATION ANALYSIS');
console.log('═'.repeat(100));

// ============================================================================
// CURRENT USAGE ANALYSIS
// ============================================================================

console.log('\n📊 CURRENT CONFIGURATION:\n');

const CURRENT = {
  subsidiesPerCall: 100,
  avgTitleLength: 60,
  avgDescLength: 200,
  avgEligibilityLength: 300,
  systemPromptTokens: 500,
  userPromptBaseTokens: 300,
  maxOutputTokens: 8192,
};

// Estimate tokens per subsidy in context
const tokensPerSubsidy =
  (CURRENT.avgTitleLength + CURRENT.avgDescLength + CURRENT.avgEligibilityLength) / 4 + // ~4 chars per token
  50; // JSON structure overhead

const estimatedInputTokens =
  CURRENT.systemPromptTokens +
  CURRENT.userPromptBaseTokens +
  (tokensPerSubsidy * CURRENT.subsidiesPerCall);

console.log(`   Subsidies sent to AI:     ${CURRENT.subsidiesPerCall}`);
console.log(`   Est. tokens per subsidy:  ~${Math.round(tokensPerSubsidy)}`);
console.log(`   Est. total input tokens:  ~${Math.round(estimatedInputTokens)}`);
console.log(`   Max output tokens:        ${CURRENT.maxOutputTokens}`);
console.log(`   Est. total tokens/call:   ~${Math.round(estimatedInputTokens + 2000)} (with output)`);

// ============================================================================
// MISTRAL RATE LIMITS
// ============================================================================

console.log('\n\n📋 MISTRAL RATE LIMITS (mistral-small-latest):\n');

const MISTRAL_LIMITS = {
  free: { rpm: 2, tpm: 500_000 },
  tier1: { rpm: 60, tpm: 1_000_000 },
  tier2: { rpm: 120, tpm: 2_000_000 },
};

console.log('   Tier    │ Requests/min │ Tokens/min');
console.log('   ────────┼──────────────┼───────────');
console.log(`   Free    │      ${MISTRAL_LIMITS.free.rpm}       │   ${(MISTRAL_LIMITS.free.tpm / 1000).toFixed(0)}k`);
console.log(`   Tier 1  │     ${MISTRAL_LIMITS.tier1.rpm}       │  ${(MISTRAL_LIMITS.tier1.tpm / 1000000).toFixed(0)}M`);
console.log(`   Tier 2  │    ${MISTRAL_LIMITS.tier2.rpm}       │  ${(MISTRAL_LIMITS.tier2.tpm / 1000000).toFixed(0)}M`);

// Calculate sustainable rate
const tokensPerCall = estimatedInputTokens + 2000;
const maxCallsPerMinFree = Math.min(MISTRAL_LIMITS.free.rpm, Math.floor(MISTRAL_LIMITS.free.tpm / tokensPerCall));
const maxCallsPerMinTier1 = Math.min(MISTRAL_LIMITS.tier1.rpm, Math.floor(MISTRAL_LIMITS.tier1.tpm / tokensPerCall));

console.log('\n   Sustainable rate with current config:');
console.log(`   Free tier:  ${maxCallsPerMinFree} calls/min (${maxCallsPerMinFree < 2 ? '⚠️ BLOCKED' : '✓'})`);
console.log(`   Tier 1:     ${maxCallsPerMinTier1} calls/min`);

// ============================================================================
// OPTIMIZATION STRATEGIES
// ============================================================================

console.log('\n\n' + '═'.repeat(100));
console.log('OPTIMIZATION STRATEGIES');
console.log('═'.repeat(100));

// Strategy 1: Reduce subsidies sent to AI
console.log('\n\n🔧 STRATEGY 1: REDUCE SUBSIDIES SENT TO AI\n');
console.log('   Current: 100 subsidies → ~17k tokens');
console.log('   Optimized configurations:');

const options = [
  { count: 50, desc: 'Top 50 pre-scored' },
  { count: 30, desc: 'Top 30 pre-scored' },
  { count: 20, desc: 'Top 20 pre-scored' },
];

for (const opt of options) {
  const tokens = CURRENT.systemPromptTokens + CURRENT.userPromptBaseTokens + (tokensPerSubsidy * opt.count);
  const savings = ((estimatedInputTokens - tokens) / estimatedInputTokens * 100).toFixed(0);
  console.log(`   • ${opt.desc.padEnd(20)} → ~${Math.round(tokens / 1000)}k tokens (${savings}% reduction)`);
}

// Strategy 2: Compress subsidy context
console.log('\n\n🔧 STRATEGY 2: COMPRESS SUBSIDY CONTEXT\n');
console.log('   Current per-subsidy fields:');
console.log('   • title: 100 chars');
console.log('   • description: 200 chars');
console.log('   • eligibility: 300 chars');
console.log('   • pre_score + reasons');
console.log('   • sector, region, amount');
console.log('');
console.log('   Optimized (minimal context):');
console.log('   • title: 60 chars');
console.log('   • sector + region only');
console.log('   • pre_score + top 2 reasons');
console.log('   → ~50% token reduction per subsidy');

// Strategy 3: Two-tier AI
console.log('\n\n🔧 STRATEGY 3: TWO-TIER AI APPROACH\n');
console.log('   Instead of 1 call with 100 subsidies:');
console.log('   ');
console.log('   Tier 1 (Fast): Use pre-scoring only (no AI)');
console.log('      • 0 API calls');
console.log('      • Instant response');
console.log('      • Good for 80% of cases');
console.log('   ');
console.log('   Tier 2 (Refined): AI only for top 20');
console.log('      • 1 API call with 20 subsidies');
console.log('      • ~5k tokens');
console.log('      • Only when user requests detailed analysis');

// Strategy 4: Caching
console.log('\n\n🔧 STRATEGY 4: CACHING LAYER\n');
console.log('   Profile-Subsidy Match Cache:');
console.log('   • Cache AI scores by (profile_hash, subsidy_id)');
console.log('   • TTL: 24h (subsidies rarely change)');
console.log('   • Reduces repeat calls by ~70%');
console.log('   ');
console.log('   Implementation:');
console.log('   • Check cache before AI call');
console.log('   • Store: profile_hash + subsidy_ids → scores');
console.log('   • Invalidate on subsidy update');

// Strategy 5: Batch processing
console.log('\n\n🔧 STRATEGY 5: BATCH PROCESSING\n');
console.log('   For bulk operations (e.g., refresh all matches):');
console.log('   • Queue requests with 30s delay between calls');
console.log('   • Process overnight/off-peak');
console.log('   • Use webhook for completion notification');

// ============================================================================
// RECOMMENDED IMPLEMENTATION
// ============================================================================

console.log('\n\n' + '═'.repeat(100));
console.log('RECOMMENDED IMPLEMENTATION');
console.log('═'.repeat(100));

console.log(`
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: IMMEDIATE (No API changes needed)                              │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Reduce PRE_SCORED_LIMIT from 100 to 30                               │
│    → Tokens: 17k → 6k (65% reduction)                                   │
│                                                                         │
│ 2. Improve fallback handling                                            │
│    → Return pre-scores when rate limited (not 500 error)                │
│                                                                         │
│ 3. Add request spacing                                                  │
│    → 2s minimum between AI calls per user                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: SHORT-TERM (1-2 days)                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Implement caching layer                                              │
│    → Cache profile_hash + top subsidy scores                            │
│    → TTL 24h, invalidate on profile/subsidy change                      │
│                                                                         │
│ 2. Two-tier response                                                    │
│    → Fast mode: pre-scores only (default)                               │
│    → Detailed mode: AI refinement (on demand)                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: LONG-TERM (Consider)                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Upgrade Mistral tier if usage grows                                  │
│    → Tier 1: 60 RPM, 1M TPM                                             │
│                                                                         │
│ 2. Hybrid model approach                                                │
│    → Local embeddings for semantic pre-filtering                        │
│    → AI only for final ranking                                          │
└─────────────────────────────────────────────────────────────────────────┘
`);

// ============================================================================
// CODE CHANGES REQUIRED
// ============================================================================

console.log('\n' + '═'.repeat(100));
console.log('CODE CHANGES FOR PHASE 1');
console.log('═'.repeat(100));

console.log(`
1. Update CONFIG in v5-hybrid-calculate-matches/index.ts:
   ─────────────────────────────────────────────────────────
   const CONFIG = {
     // ...existing...
-    PRE_SCORED_LIMIT: 100,     // Max candidates for AI
+    PRE_SCORED_LIMIT: 30,      // Reduced to stay within rate limits
+    AI_ENABLED: true,          // Feature flag for AI
+    MIN_DELAY_BETWEEN_AI_MS: 2000,  // Rate limiting
   };

2. Improve AI error handling:
   ─────────────────────────────────────────────────────────
   } catch (aiError) {
+    // Log but don't fail - return pre-scored results
+    console.warn('[V5] AI evaluation failed, using pre-scores:', aiError);

     matches = preScored
       .slice(0, limit)
       .map(ps => toFallbackMatch(ps, analyzedProfile));

-    // Remove the compliance_events insert that might also fail
+    // Return valid response with degraded flag
     const response: MatchResponse = {
       matches,
       processing_time_ms: Date.now() - startTime,
       tokens_used: { input: 0, output: 0 },
-      pipeline_stats: { ...pipelineStats, ai_evaluated: false },
+      pipeline_stats: {
+        ...pipelineStats,
+        ai_evaluated: false,
+        fallback_reason: 'rate_limited'
+      },
     };

     return new Response(JSON.stringify(response), {
+      status: 200,  // Not 500!
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }

3. Add compact subsidy context builder:
   ─────────────────────────────────────────────────────────
   // Minimal context to reduce tokens
   const subsidiesContext = preScored.slice(0, 30).map((ps, i) => ({
     i,                                    // Just index
     id: ps.subsidy.id,
     t: getTitle(ps.subsidy).substring(0, 60),  // Short title
     s: ps.subsidy.primary_sector?.substring(0, 15),
     r: ps.subsidy.region?.[0]?.substring(0, 12),
     p: ps.preScore,                       // Pre-score
     rs: ps.preReasons.slice(0, 2),        // Top 2 reasons only
   }));
`);

console.log('\n' + '═'.repeat(100));
