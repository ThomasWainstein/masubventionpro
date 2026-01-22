import type { PIIMatch, PIIType } from './types';
import { detectPII } from './detector';

/**
 * Mask a single value based on its PII type
 */
function maskValue(value: string, type: PIIType): string {
  const len = value.length;

  switch (type) {
    case 'siret':
      // Show first 5 digits: 12345*********
      return value.substring(0, 5) + '*'.repeat(Math.max(0, len - 5));

    case 'siren':
      // Show first 3 digits: 123******
      return value.substring(0, 3) + '*'.repeat(Math.max(0, len - 3));

    case 'nir':
      // Mask completely: ***************
      return '*'.repeat(len);

    case 'phone':
      // Show last 2 digits: ** ** ** ** 45
      const cleanPhone = value.replace(/[\s.-]/g, '');
      return '** ** ** ** ' + cleanPhone.slice(-2);

    case 'email':
      // Show first letter and domain: t***@gmail.com
      const atIndex = value.indexOf('@');
      if (atIndex > 0) {
        return value[0] + '***' + value.substring(atIndex);
      }
      return '***@***';

    case 'iban':
      // Show country and last 4: FR** **** **** **** **** **** 123
      const cleanIban = value.replace(/\s/g, '');
      return cleanIban.substring(0, 2) + '** **** **** **** **** **** ' + cleanIban.slice(-3);

    case 'creditCard':
      // Show last 4 digits: **** **** **** 1234
      const cleanCard = value.replace(/[\s-]/g, '');
      return '**** **** **** ' + cleanCard.slice(-4);

    case 'postalCode':
      // Show first 2 digits: 75***
      return value.substring(0, 2) + '***';

    case 'address':
      // Replace with generic: [ADRESSE]
      return '[ADRESSE]';

    default:
      // Generic mask: show first char + asterisks
      return value[0] + '*'.repeat(Math.max(0, len - 1));
  }
}

/**
 * Mask PII in text using provided matches
 * Replaces from end to start to preserve positions
 */
export function maskPIIWithMatches(text: string, matches: PIIMatch[]): string {
  if (!matches.length) return text;

  // Sort by position descending to replace from end
  const sortedMatches = [...matches].sort((a, b) => b.start - a.start);

  let result = text;
  for (const match of sortedMatches) {
    const masked = maskValue(match.value, match.type);
    result = result.substring(0, match.start) + masked + result.substring(match.end);
  }

  return result;
}

/**
 * Detect and mask all PII in text
 */
export function maskPII(text: string): string {
  const { matches } = detectPII(text);
  return maskPIIWithMatches(text, matches);
}

/**
 * Mask a specific field value (for UI display)
 */
export function maskField(value: string, type: PIIType): string {
  if (!value) return '';
  return maskValue(value, type);
}
