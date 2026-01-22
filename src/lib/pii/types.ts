/**
 * Types for PII (Personally Identifiable Information) detection
 */

export type PIIType =
  | 'siret'
  | 'siren'
  | 'nir'
  | 'phone'
  | 'email'
  | 'iban'
  | 'creditCard'
  | 'postalCode'
  | 'address';

export interface PIIMatch {
  type: PIIType;
  value: string;
  start: number;
  end: number;
  label: string;
}

export interface PIIDetectionResult {
  hasPII: boolean;
  matches: PIIMatch[];
  types: PIIType[];
}

export interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  label: string;
  validate?: (match: string) => boolean;
}

export type PIIUserChoice = 'send' | 'mask' | 'cancel';

export interface PendingPIIMessage {
  message: string;
  matches: PIIMatch[];
}
