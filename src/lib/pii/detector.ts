import type { PIIMatch, PIIDetectionResult, PIIType } from './types';
import { PII_PATTERNS } from './patterns';

/**
 * Detect PII (Personally Identifiable Information) in text
 * @param text - The text to scan for PII
 * @returns Detection result with matches and types found
 */
export function detectPII(text: string): PIIDetectionResult {
  if (!text || typeof text !== 'string') {
    return { hasPII: false, matches: [], types: [] };
  }

  const matches: PIIMatch[] = [];
  const foundTypes = new Set<PIIType>();

  for (const { type, pattern, label, validate } of PII_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];

      // Skip if validation function exists and fails
      if (validate && !validate(value)) {
        continue;
      }

      // Avoid duplicates at same position
      const isDuplicate = matches.some(
        m => m.start === match!.index && m.end === match!.index + value.length
      );

      if (!isDuplicate) {
        matches.push({
          type,
          value,
          start: match.index,
          end: match.index + value.length,
          label,
        });
        foundTypes.add(type);
      }
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  return {
    hasPII: matches.length > 0,
    matches,
    types: Array.from(foundTypes),
  };
}

/**
 * Check if text contains any PII (quick check)
 */
export function hasPII(text: string): boolean {
  return detectPII(text).hasPII;
}

/**
 * Get unique PII types found in text
 */
export function getPIITypes(text: string): PIIType[] {
  return detectPII(text).types;
}
