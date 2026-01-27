import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import {
  Building2,
  MapPin,
  Users,
  Calendar,
  Briefcase,
  FileText,
  Edit,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building,
  Hash,
  Globe,
  ArrowLeft,
  ScrollText,
  UserCircle,
  Store,
  Euro,
  Pencil,
} from 'lucide-react';
import { BUSINESS_SECTORS } from '@/types';
import { formatSIRET } from '@/lib/validation/siret';
import { MaskedField } from '@/components/ui/MaskedField';
import { DocumentUpload } from '@/components/profile/DocumentUpload';
import { ProfileEnrichmentSection } from '@/components/profile/ProfileEnrichmentSection';
import { WebsiteIntelligenceDisplay } from '@/components/profile/WebsiteIntelligenceDisplay';
import CompanyLogoUploadModal from '@/components/profile/CompanyLogoUploadModal';
import type { WebsiteIntelligenceData } from '@/types';

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, loading, hasProfile, refreshProfile } = useProfile();
  const [showLogoModal, setShowLogoModal] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!hasProfile || !profile) {
    return (
      <div className="max-w-3xl mx-auto">
        <Helmet>
          <title>Mon profil - MaSubventionPro</title>
        </Helmet>

        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Aucun profil configuré
          </h2>
          <p className="text-slate-600 mb-6">
            Configurez votre profil entreprise pour recevoir des recommandations personnalisées
          </p>
          <Link to="/app/profile/edit">
            <Button>Configurer mon profil</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate profile completeness
  const completeness = calculateCompleteness(profile);
  const missingFields = getMissingFields(profile);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Helmet>
        <title>Mon profil - MaSubventionPro</title>
      </Helmet>

      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/app')}
        className="-ml-2 text-slate-600"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour au tableau de bord
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo with edit overlay */}
          <button
            onClick={() => setShowLogoModal(true)}
            className="relative group cursor-pointer"
            title="Modifier le logo"
          >
            <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-xl overflow-hidden">
              {profile.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.company_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-7 h-7 text-blue-600" />
              )}
            </div>
            {/* Pencil overlay */}
            <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Pencil className="w-5 h-5 text-white" />
            </div>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profile.company_name}</h1>
            {profile.siret && (
              <p className="text-slate-500 text-sm flex items-center gap-1">
                SIRET: <MaskedField value={formatSIRET(profile.siret)} type="siret" className="text-slate-500" />
              </p>
            )}
          </div>
        </div>
        <Link to="/app/profile/edit">
          <Button className="gap-2">
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
        </Link>
      </div>

      {/* Profile Completeness - compact when 100% */}
      {completeness === 100 ? (
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium border border-emerald-200">
          <CheckCircle className="h-4 w-4" />
          Profil complet
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {completeness >= 80 ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium text-slate-900">Complétude du profil</span>
            </div>
            <span className="text-sm font-semibold text-slate-700">{completeness}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                completeness >= 80
                  ? 'bg-emerald-500'
                  : completeness >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${completeness}%` }}
            />
          </div>
          {missingFields.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-slate-500 mb-2">
                Champs manquants :
              </p>
              <div className="flex flex-wrap gap-2">
                {missingFields.map((field) => (
                  <span
                    key={field}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Enrichment Section */}
      <ProfileEnrichmentSection />

      {/* Website Intelligence Display */}
      {profile.website_intelligence && (
        <WebsiteIntelligenceDisplay
          data={profile.website_intelligence as WebsiteIntelligenceData}
          websiteUrl={profile.website_url}
        />
      )}

      {/* Company Information */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Building className="h-5 w-5 text-slate-400" />
            Informations de l'entreprise
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Name */}
          <InfoItem
            icon={Building2}
            label="Nom de l'entreprise"
            value={profile.company_name}
          />

          {/* SIRET */}
          <div className="flex items-start gap-3">
            <Hash className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-slate-500">SIRET</p>
              {profile.siret ? (
                <MaskedField value={formatSIRET(profile.siret)} type="siret" className="font-medium" />
              ) : (
                <p className="text-slate-400 font-normal">Non renseigné</p>
              )}
            </div>
          </div>

          {/* Sector */}
          <InfoItem
            icon={Briefcase}
            label="Secteur d'activité"
            value={profile.naf_label || formatSector(profile.sector) || profile.sector}
          />

          {/* NAF Code */}
          {profile.naf_code && (
            <InfoItem
              icon={FileText}
              label="Code NAF"
              value={profile.naf_code}
            />
          )}

          {/* Region */}
          <InfoItem
            icon={MapPin}
            label="Région"
            value={profile.region}
          />

          {/* City */}
          {profile.city && (
            <InfoItem
              icon={MapPin}
              label="Ville"
              value={`${profile.city}${profile.postal_code ? ` (${profile.postal_code})` : ''}`}
            />
          )}

          {/* Employees */}
          <InfoItem
            icon={Users}
            label="Effectifs"
            value={formatEmployees(profile.employees)}
          />

          {/* Legal Form */}
          <InfoItem
            icon={FileText}
            label="Forme juridique"
            value={profile.legal_form}
          />

          {/* Year Created */}
          <InfoItem
            icon={Calendar}
            label="Année de création"
            value={profile.year_created?.toString()}
          />

          {/* Company Category */}
          {profile.company_category && (
            <InfoItem
              icon={Building}
              label="Catégorie"
              value={profile.company_category}
            />
          )}

          {/* Annual Turnover */}
          {profile.annual_turnover && (
            <InfoItem
              icon={FileText}
              label="Chiffre d'affaires"
              value={formatTurnover(profile.annual_turnover)}
            />
          )}

          {/* Website URL */}
          {profile.website_url && (
            <InfoItem
              icon={Globe}
              label="Site web"
              value={profile.website_url}
              isLink
            />
          )}

          {/* Convention Collective */}
          {profile.convention_collective && profile.convention_collective.length > 0 && (
            <InfoItem
              icon={ScrollText}
              label="Convention collective"
              value={`IDCC ${profile.convention_collective.join(', ')}`}
            />
          )}

          {/* Nombre d'établissements */}
          {profile.nombre_etablissements !== null && profile.nombre_etablissements > 0 && (
            <InfoItem
              icon={Store}
              label="Établissements"
              value={`${profile.nombre_etablissements_ouverts || 0} actif(s) sur ${profile.nombre_etablissements}`}
            />
          )}

          {/* Capital social */}
          {profile.capital_social !== null && profile.capital_social > 0 && (
            <InfoItem
              icon={Euro}
              label="Capital social"
              value={formatCapitalSocial(profile.capital_social)}
            />
          )}
        </div>
      </div>

      {/* Dirigeants */}
      {profile.dirigeants && profile.dirigeants.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-slate-400" />
              Dirigeants
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {profile.dirigeants.map((dirigeant, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <UserCircle className="h-8 w-8 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {dirigeant.prenoms} {dirigeant.nom}
                    </p>
                    <p className="text-sm text-slate-500">{dirigeant.qualite}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {profile.description && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              Description de l'entreprise
            </h2>
          </div>
          <div className="p-6">
            <p className="text-slate-700 whitespace-pre-wrap">{profile.description}</p>
          </div>
        </div>
      )}

      {/* Project Types */}
      {profile.project_types && profile.project_types.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Types de projets recherchés</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {profile.project_types.map((type) => (
                <span
                  key={type}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  {formatProjectType(type)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Address */}
      {profile.address && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-400" />
              Adresse
            </h2>
          </div>
          <div className="p-6">
            <p className="text-slate-700">{profile.address}</p>
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            Documents
          </h2>
        </div>
        <div className="p-6">
          <DocumentUpload />
        </div>
      </div>

      {/* Logo Upload Modal */}
      <CompanyLogoUploadModal
        open={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        profileId={profile.id}
        currentLogoUrl={profile.logo_url}
        onLogoUpdated={() => {
          refreshProfile();
        }}
      />
    </div>
  );
}

interface InfoItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
}

function InfoItem({ icon: Icon, label, value, isLink }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        {value ? (
          isLink ? (
            <a
              href={value.startsWith('http') ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              {value}
            </a>
          ) : (
            <p className="text-slate-900 font-medium">{value}</p>
          )
        ) : (
          <p className="text-slate-400 font-normal">Non renseigné</p>
        )}
      </div>
    </div>
  );
}

const PROFILE_FIELDS = [
  { key: 'company_name', label: 'Nom de l\'entreprise' },
  { key: 'siret', label: 'SIRET' },
  { key: 'sector', label: 'Secteur d\'activite' },
  { key: 'region', label: 'Région' },
  { key: 'employees', label: 'Nombre de salariés' },
  { key: 'legal_form', label: 'Forme juridique' },
  { key: 'year_created', label: 'Année de création' },
  { key: 'naf_code', label: 'Code NAF' },
  { key: 'website_url', label: 'Site web' },
  { key: 'description', label: 'Description' },
];

function calculateCompleteness(profile: any): number {
  const filled = PROFILE_FIELDS.filter((field) => {
    const value = profile[field.key];
    return value !== null && value !== undefined && value !== '';
  });

  return Math.round((filled.length / PROFILE_FIELDS.length) * 100);
}

function getMissingFields(profile: any): string[] {
  return PROFILE_FIELDS
    .filter((field) => {
      const value = profile[field.key];
      return value === null || value === undefined || value === '';
    })
    .map((field) => field.label);
}

function formatSector(sectorValue: string | null | undefined): string | null {
  if (!sectorValue) return null;
  const sector = BUSINESS_SECTORS.find(s => s.value === sectorValue);
  return sector ? sector.label : sectorValue;
}

function formatEmployees(employees: string | null | undefined): string | null {
  if (!employees) return null;

  const mapping: Record<string, string> = {
    '1-10': '1 à 10 salariés',
    '11-50': '11 à 50 salariés',
    '51-250': '51 à 250 salariés',
    '250+': 'Plus de 250 salariés',
  };

  return mapping[employees] || employees;
}

function formatTurnover(turnover: number): string {
  if (turnover >= 1000000) {
    return `${(turnover / 1000000).toFixed(1)}M EUR`;
  }
  if (turnover >= 1000) {
    return `${(turnover / 1000).toFixed(0)}K EUR`;
  }
  return `${turnover} EUR`;
}

function formatCapitalSocial(capital: number): string {
  // Format with French locale (spaces as thousands separator)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(capital);
}

function formatProjectType(type: string): string {
  const mapping: Record<string, string> = {
    innovation: 'Innovation / R&D',
    export: 'Export / International',
    'transition-eco': 'Transition écologique',
    numerique: 'Transformation numérique',
    emploi: 'Emploi / Formation',
    creation: 'Création / Reprise',
    investissement: 'Investissement',
    tresorerie: 'Trésorerie',
  };

  return mapping[type] || type;
}

export default ProfilePage;
