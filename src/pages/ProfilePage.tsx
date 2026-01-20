import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { BUSINESS_SECTORS } from '@/types';
import { formatSIRET } from '@/lib/validation/siret';
import { DocumentUpload } from '@/components/profile/DocumentUpload';

export function ProfilePage() {
  const { profile, loading, hasProfile } = useProfile();

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
            Aucun profil configure
          </h2>
          <p className="text-slate-600 mb-6">
            Configurez votre profil entreprise pour recevoir des recommandations personnalisees
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Helmet>
        <title>Mon profil - MaSubventionPro</title>
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-xl">
            <Building2 className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profile.company_name}</h1>
            {profile.siret && (
              <p className="text-slate-500 text-sm">SIRET: {formatSIRET(profile.siret)}</p>
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

      {/* Profile Completeness */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {completeness >= 80 ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            <span className="font-medium text-slate-900">Completude du profil</span>
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
        {completeness < 80 && (
          <p className="text-sm text-slate-500 mt-2">
            Completez votre profil pour ameliorer la pertinence des recommandations
          </p>
        )}
      </div>

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
          <InfoItem
            icon={Hash}
            label="SIRET"
            value={profile.siret ? formatSIRET(profile.siret) : null}
          />

          {/* Sector */}
          <InfoItem
            icon={Briefcase}
            label="Secteur d'activite"
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
            label="Region"
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
            label="Annee de creation"
            value={profile.year_created?.toString()}
          />

          {/* Company Category */}
          {profile.company_category && (
            <InfoItem
              icon={Building}
              label="Categorie"
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
        </div>
      </div>

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
            <h2 className="font-semibold text-slate-900">Types de projets recherches</h2>
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
          <p className="text-slate-400 font-normal">Non renseigne</p>
        )}
      </div>
    </div>
  );
}

function calculateCompleteness(profile: any): number {
  const fields = [
    'company_name',
    'siret',
    'sector',
    'region',
    'employees',
    'legal_form',
    'year_created',
    'naf_code',
    'website_url',
    'description',
  ];

  const filled = fields.filter((field) => {
    const value = profile[field];
    return value !== null && value !== undefined && value !== '';
  });

  return Math.round((filled.length / fields.length) * 100);
}

function formatSector(sectorValue: string | null | undefined): string | null {
  if (!sectorValue) return null;
  const sector = BUSINESS_SECTORS.find(s => s.value === sectorValue);
  return sector ? sector.label : sectorValue;
}

function formatEmployees(employees: string | null | undefined): string | null {
  if (!employees) return null;

  const mapping: Record<string, string> = {
    '1-10': '1 a 10 salaries',
    '11-50': '11 a 50 salaries',
    '51-250': '51 a 250 salaries',
    '250+': 'Plus de 250 salaries',
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

function formatProjectType(type: string): string {
  const mapping: Record<string, string> = {
    innovation: 'Innovation / R&D',
    export: 'Export / International',
    'transition-eco': 'Transition ecologique',
    numerique: 'Transformation numerique',
    emploi: 'Emploi / Formation',
    creation: 'Creation / Reprise',
    investissement: 'Investissement',
    tresorerie: 'Tresorerie',
  };

  return mapping[type] || type;
}

export default ProfilePage;
