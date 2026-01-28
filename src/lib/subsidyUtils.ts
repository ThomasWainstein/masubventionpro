import { Subsidy } from '@/types';

// Amount formatting utilities

export function formatAmountAbbreviated(amount: number | null): string | null {
  if (amount === null) return null;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace('.0', '')}M€`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}K€`;
  return `${amount}€`;
}

export function formatAmountFull(amount: number | null): string | null {
  if (amount === null) return null;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getAmountDisplay(
  amountMin: number | null,
  amountMax: number | null,
  format: 'abbreviated' | 'full' = 'abbreviated'
): string | null {
  const formatter = format === 'abbreviated' ? formatAmountAbbreviated : formatAmountFull;
  const max = formatter(amountMax);
  const min = formatter(amountMin);

  if (max && min && amountMin !== amountMax) {
    return `${min} - ${max}`;
  }
  if (max) return `Jusqu'à ${max}`;
  if (min) return `À partir de ${min}`;
  return null;
}

// Deadline utilities

export function getDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDeadlineStatus(deadline: string | null): 'expired' | 'urgent' | 'soon' | 'normal' | null {
  const daysUntil = getDaysUntilDeadline(deadline);
  if (daysUntil === null) return null;
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 7) return 'urgent';
  if (daysUntil <= 30) return 'soon';
  return 'normal';
}

export function formatDeadlineDisplay(deadline: string | null, format: 'short' | 'full' = 'short'): string | null {
  if (!deadline) return null;
  const options: Intl.DateTimeFormatOptions = format === 'full'
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short' };
  return new Date(deadline).toLocaleDateString('fr-FR', options);
}

export function getDeadlineColorClasses(status: ReturnType<typeof getDeadlineStatus>): string {
  switch (status) {
    case 'expired':
      return 'text-red-700 bg-red-50';
    case 'urgent':
      return 'text-orange-700 bg-orange-50';
    case 'soon':
      return 'text-amber-700 bg-amber-50';
    case 'normal':
      return 'text-slate-600 bg-slate-100';
    default:
      return 'text-slate-600 bg-slate-100';
  }
}

// Entity type utilities

export interface EntityTypeBadge {
  label: string;
  type: 'association' | 'entreprise' | 'collectivite' | 'etablissement_public' | 'particulier' | 'other';
  colorClasses: string;
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  entreprise: 'bg-blue-50 text-blue-700 border-blue-200',
  association: 'bg-teal-50 text-teal-700 border-teal-200',
  collectivite: 'bg-purple-50 text-purple-700 border-purple-200',
  etablissement_public: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  particulier: 'bg-orange-50 text-orange-700 border-orange-200',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  entreprise: 'Entreprises',
  association: 'Associations',
  collectivite: 'Collectivités',
  etablissement_public: 'Établissements publics',
  particulier: 'Particuliers',
};

export function getEntityTypeBadges(subsidy: Subsidy): EntityTypeBadge[] {
  const badges: EntityTypeBadge[] = [];
  const addedTypes = new Set<string>();

  // Check explicit boolean flags first
  if (subsidy.association_eligible === true) {
    badges.push({
      label: 'Associations',
      type: 'association',
      colorClasses: ENTITY_TYPE_COLORS.association,
    });
    addedTypes.add('association');
  }

  if (subsidy.company_only === true) {
    badges.push({
      label: 'Entreprises uniquement',
      type: 'entreprise',
      colorClasses: ENTITY_TYPE_COLORS.entreprise,
    });
    addedTypes.add('entreprise');
  }

  // Then check eligible_entity_types array
  if (subsidy.eligible_entity_types && subsidy.eligible_entity_types.length > 0) {
    for (const type of subsidy.eligible_entity_types) {
      const normalizedType = type.toLowerCase();
      if (!addedTypes.has(normalizedType)) {
        badges.push({
          label: ENTITY_TYPE_LABELS[normalizedType] || type,
          type: normalizedType as EntityTypeBadge['type'],
          colorClasses: ENTITY_TYPE_COLORS[normalizedType] || ENTITY_TYPE_COLORS.other,
        });
        addedTypes.add(normalizedType);
      }
    }
  }

  return badges;
}

// Contact utilities

export function hasContacts(subsidy: Subsidy): boolean {
  return !!(subsidy.contacts && subsidy.contacts.length > 0);
}

export function getContactsCount(subsidy: Subsidy): number {
  return subsidy.contacts?.length || 0;
}

// Project types utilities

export function hasProjectTypes(subsidy: Subsidy): boolean {
  return !!(subsidy.decoded_projets && subsidy.decoded_projets.length > 0);
}

export function getProjectTypeLabels(subsidy: Subsidy, limit?: number): string[] {
  if (!subsidy.decoded_projets) return [];
  const labels = subsidy.decoded_projets.map(p => p.label || p.code);
  return limit ? labels.slice(0, limit) : labels;
}

// Funding agencies utilities

export function hasFundingAgencies(subsidy: Subsidy): boolean {
  return !!(subsidy.decoded_financeurs && subsidy.decoded_financeurs.length > 0);
}

export function getFundingAgencyLabels(subsidy: Subsidy): string[] {
  if (!subsidy.decoded_financeurs) return [];
  return subsidy.decoded_financeurs.map(f => f.label || f.code);
}

// Complementary info utilities

export function hasComplementaryForms(subsidy: Subsidy): boolean {
  return !!(subsidy.complements_formulaires?.trim());
}

export function hasComplementarySources(subsidy: Subsidy): boolean {
  return !!(subsidy.complements_sources?.trim());
}

export function hasAidObjective(subsidy: Subsidy): boolean {
  return !!(subsidy.aid_objet?.trim());
}
