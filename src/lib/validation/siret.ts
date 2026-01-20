/**
 * SIRET/SIREN Validation with Luhn Algorithm
 * French business identifier validation
 */

/**
 * Luhn algorithm checksum validation
 * Used for SIRET (14 digits) and SIREN (9 digits)
 */
export function validateLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits)) {
    return false;
  }

  if (digits.length < 2) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate French SIRET number (14 digits)
 * SIRET = SIREN (9 digits) + NIC (5 digits)
 */
export function validateSIRET(siret: string | number): boolean {
  const siretStr = String(siret).replace(/\s/g, '');

  if (siretStr.length !== 14) {
    return false;
  }

  if (!/^\d{14}$/.test(siretStr)) {
    return false;
  }

  return validateLuhn(siretStr);
}

/**
 * Validate French SIREN number (9 digits)
 */
export function validateSIREN(siren: string | number): boolean {
  const sirenStr = String(siren).replace(/\s/g, '');

  if (sirenStr.length !== 9) {
    return false;
  }

  if (!/^\d{9}$/.test(sirenStr)) {
    return false;
  }

  return validateLuhn(sirenStr);
}

/**
 * Format SIRET for display (add spaces every 3 digits)
 */
export function formatSIRET(siret: string | number): string {
  const siretStr = String(siret).replace(/\s/g, '');

  if (siretStr.length !== 14) {
    return siretStr;
  }

  return siretStr.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4');
}

/**
 * Format SIREN for display (add spaces every 3 digits)
 */
export function formatSIREN(siren: string | number): string {
  const sirenStr = String(siren).replace(/\s/g, '');

  if (sirenStr.length !== 9) {
    return sirenStr;
  }

  return sirenStr.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}

/**
 * Extract SIREN from SIRET
 */
export function extractSIREN(siret: string | number): string | null {
  const siretStr = String(siret).replace(/\s/g, '');

  if (siretStr.length !== 14 || !/^\d{14}$/.test(siretStr)) {
    return null;
  }

  return siretStr.substring(0, 9);
}

/**
 * Detect if input is SIRET, SIREN, or company name
 */
export function detectInputType(input: string): 'siret' | 'siren' | 'name' {
  const cleaned = input.replace(/\s/g, '');

  if (/^\d{14}$/.test(cleaned)) {
    return 'siret';
  }

  if (/^\d{9}$/.test(cleaned)) {
    return 'siren';
  }

  return 'name';
}
