import type { PIIPattern } from './types';

/**
 * Luhn algorithm validation for SIRET/SIREN
 */
function isValidLuhn(num: string): boolean {
  const digits = num.replace(/\s/g, '').split('').map(Number);
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate French NIR (Social Security Number) with key
 */
function isValidNIR(nir: string): boolean {
  const clean = nir.replace(/\s/g, '');
  if (clean.length !== 15) return false;

  const base = clean.substring(0, 13);
  const key = parseInt(clean.substring(13, 15), 10);

  // Handle Corsica (2A, 2B)
  let numBase = base.replace(/[aA]/g, '0').replace(/[bB]/g, '0');
  const expectedKey = 97 - (parseInt(numBase, 10) % 97);

  return key === expectedKey;
}

/**
 * French PII patterns for detection
 */
export const PII_PATTERNS: PIIPattern[] = [
  {
    type: 'siret',
    // SIRET: 14 digits (can have spaces)
    pattern: /\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/g,
    label: 'SIRET',
    validate: (match) => {
      const clean = match.replace(/\s/g, '');
      return clean.length === 14 && isValidLuhn(clean);
    },
  },
  {
    type: 'siren',
    // SIREN: 9 digits (can have spaces) - but NOT if it's part of a SIRET
    pattern: /\b\d{3}\s?\d{3}\s?\d{3}\b(?!\s?\d)/g,
    label: 'SIREN',
    validate: (match) => {
      const clean = match.replace(/\s/g, '');
      return clean.length === 9 && isValidLuhn(clean);
    },
  },
  {
    type: 'nir',
    // NIR: French social security number (15 digits with key)
    // Format: 1 85 05 78 006 084 36
    pattern: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g,
    label: 'Numero de securite sociale',
    validate: isValidNIR,
  },
  {
    type: 'phone',
    // French phone numbers: +33, 0033, or 0 followed by 9 digits
    pattern: /(?:\+33|0033|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g,
    label: 'Numero de telephone',
  },
  {
    type: 'email',
    // Standard email pattern
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    label: 'Adresse email',
  },
  {
    type: 'iban',
    // French IBAN: FR followed by 2 check digits and 23 alphanumeric chars
    pattern: /\bFR\s?\d{2}[\s.]?\d{4}[\s.]?\d{4}[\s.]?\d{4}[\s.]?\d{4}[\s.]?\d{4}[\s.]?\d{3}\b/gi,
    label: 'IBAN',
  },
  {
    type: 'creditCard',
    // Credit card: 16 digits (can have spaces or dashes)
    pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
    label: 'Numero de carte bancaire',
    validate: (match) => {
      const clean = match.replace(/[\s-]/g, '');
      // Only validate if 16 digits and passes Luhn
      return clean.length === 16 && isValidLuhn(clean);
    },
  },
];

/**
 * Get label for a PII type
 */
export function getPIILabel(type: string): string {
  const pattern = PII_PATTERNS.find(p => p.type === type);
  return pattern?.label || type;
}
