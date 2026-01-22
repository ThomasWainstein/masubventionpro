// Types
export type {
  PIIType,
  PIIMatch,
  PIIDetectionResult,
  PIIPattern,
  PIIUserChoice,
  PendingPIIMessage,
} from './types';

// Detection
export { detectPII, hasPII, getPIITypes } from './detector';

// Masking
export { maskPII, maskPIIWithMatches, maskField } from './masker';

// Patterns
export { PII_PATTERNS, getPIILabel } from './patterns';
