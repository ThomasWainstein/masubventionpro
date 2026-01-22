/**
 * Data masking utilities for displaying sensitive information in the UI
 */

export type MaskableFieldType =
  | 'siret'
  | 'siren'
  | 'email'
  | 'phone'
  | 'iban'
  | 'turnover'
  | 'generic';

/**
 * Mask a SIRET number (show first 5 digits)
 * @example "12345678901234" -> "12345*********"
 */
export function maskSIRET(value: string): string {
  if (!value) return '';
  const clean = value.replace(/\s/g, '');
  if (clean.length < 5) return '*'.repeat(clean.length);
  return clean.substring(0, 5) + '*'.repeat(Math.max(0, clean.length - 5));
}

/**
 * Mask a SIREN number (show first 3 digits)
 * @example "123456789" -> "123******"
 */
export function maskSIREN(value: string): string {
  if (!value) return '';
  const clean = value.replace(/\s/g, '');
  if (clean.length < 3) return '*'.repeat(clean.length);
  return clean.substring(0, 3) + '*'.repeat(Math.max(0, clean.length - 3));
}

/**
 * Mask an email address (show first letter and domain)
 * @example "thomas@example.com" -> "t***@example.com"
 */
export function maskEmail(value: string): string {
  if (!value) return '';
  const atIndex = value.indexOf('@');
  if (atIndex <= 0) return '***@***';
  return value[0] + '***' + value.substring(atIndex);
}

/**
 * Mask a phone number (show last 2 digits)
 * @example "06 12 34 56 78" -> "** ** ** ** 78"
 */
export function maskPhone(value: string): string {
  if (!value) return '';
  const clean = value.replace(/[\s.-]/g, '');
  if (clean.length < 2) return '*'.repeat(clean.length);
  const last2 = clean.slice(-2);
  // Format with spaces
  return '** ** ** ** ' + last2;
}

/**
 * Mask an IBAN (show country code and last 4)
 * @example "FR76 3000 6000 0112 3456 7890 189" -> "FR** **** **** **** **** **** *189"
 */
export function maskIBAN(value: string): string {
  if (!value) return '';
  const clean = value.replace(/\s/g, '');
  if (clean.length < 6) return '*'.repeat(clean.length);
  return clean.substring(0, 2) + '** **** **** **** **** **** *' + clean.slice(-3);
}

/**
 * Convert a turnover value to a range string
 * @example 750000 -> "500K - 1M EUR"
 */
export function formatTurnoverRange(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Non renseigne';

  if (value < 50000) return '< 50K EUR';
  if (value < 100000) return '50K - 100K EUR';
  if (value < 250000) return '100K - 250K EUR';
  if (value < 500000) return '250K - 500K EUR';
  if (value < 1000000) return '500K - 1M EUR';
  if (value < 2000000) return '1M - 2M EUR';
  if (value < 5000000) return '2M - 5M EUR';
  if (value < 10000000) return '5M - 10M EUR';
  if (value < 50000000) return '10M - 50M EUR';
  return '> 50M EUR';
}

/**
 * Convert an employee count to a range string
 * @example 25 -> "11-50 salaries"
 */
export function formatEmployeeRange(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Non renseigne';

  // If already a string range, return as-is
  if (typeof value === 'string') {
    if (value.includes('-') || value.includes('+')) return value;
  }

  const count = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(count)) return 'Non renseigne';

  if (count === 0) return '0 salarie';
  if (count === 1) return '1 salarie';
  if (count <= 10) return '1-10 salaries';
  if (count <= 50) return '11-50 salaries';
  if (count <= 250) return '51-250 salaries';
  return '250+ salaries';
}

/**
 * Generic masking function that picks the right masker based on type
 */
export function maskField(value: string | number | null | undefined, type: MaskableFieldType): string {
  if (value === null || value === undefined) return '';

  const strValue = String(value);

  switch (type) {
    case 'siret':
      return maskSIRET(strValue);
    case 'siren':
      return maskSIREN(strValue);
    case 'email':
      return maskEmail(strValue);
    case 'phone':
      return maskPhone(strValue);
    case 'iban':
      return maskIBAN(strValue);
    case 'turnover':
      return formatTurnoverRange(typeof value === 'number' ? value : parseFloat(strValue));
    case 'generic':
    default:
      // Generic: show first and last char
      if (strValue.length <= 2) return '*'.repeat(strValue.length);
      return strValue[0] + '*'.repeat(strValue.length - 2) + strValue[strValue.length - 1];
  }
}
