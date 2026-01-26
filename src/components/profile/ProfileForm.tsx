import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Building, CheckCircle } from 'lucide-react';
import {
  MaSubventionProProfile,
  FRENCH_REGIONS,
  EMPLOYEE_RANGES,
  LEGAL_FORMS,
  PROJECT_TYPES,
  BUSINESS_SECTORS,
} from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { CompanySearch } from './CompanySearch';
import { CompanySearchResult, fetchCapitalSocial } from '@/lib/companySearch';

interface ProfileFormProps {
  initialData?: Partial<MaSubventionProProfile>;
  onSubmit: (data: Partial<MaSubventionProProfile>) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}


/**
 * Extract year from date string (YYYY-MM-DD or YYYY)
 */
function extractYear(dateStr: string): number | null {
  if (!dateStr) return null;
  const year = parseInt(dateStr.substring(0, 4));
  return isNaN(year) ? null : year;
}

export function ProfileForm({
  initialData = {},
  onSubmit,
  submitLabel = 'Enregistrer',
  isLoading = false,
}: ProfileFormProps) {
  const [formData, setFormData] = useState({
    company_name: initialData.company_name || '',
    siret: initialData.siret || '',
    siren: initialData.siren || '',
    naf_code: initialData.naf_code || '',
    naf_label: initialData.naf_label || '',
    sector: initialData.sector || '',
    sub_sector: initialData.sub_sector || '',
    region: initialData.region || '',
    department: initialData.department || '',
    city: initialData.city || '',
    postal_code: initialData.postal_code || '',
    address: initialData.address || '',
    employees: initialData.employees || '',
    annual_turnover: initialData.annual_turnover?.toString() || '',
    year_created: initialData.year_created?.toString() || '',
    legal_form: initialData.legal_form || '',
    company_category: initialData.company_category || '',
    website_url: initialData.website_url || '',
    description: initialData.description || '',
    project_types: initialData.project_types || [],
    // New fields
    convention_collective: initialData.convention_collective || [] as string[],
    dirigeants: initialData.dirigeants || [] as MaSubventionProProfile['dirigeants'],
    nombre_etablissements: initialData.nombre_etablissements || null as number | null,
    nombre_etablissements_ouverts: initialData.nombre_etablissements_ouverts || null as number | null,
    capital_social: initialData.capital_social || null as number | null,
  });

  const [error, setError] = useState<string | null>(null);
  const [companyEnriched, setCompanyEnriched] = useState(!!initialData.siret);

  // Memoized field change handler to prevent re-renders
  const handleFieldChange = useCallback((field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  }, []);

  // Memoized select change handler
  const handleSelectChange = useCallback((field: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCompanySelect = useCallback((company: CompanySearchResult) => {
    // Auto-fill form fields from company data
    // Values are already mapped in companySearch.ts to match our form values
    setFormData((prev) => ({
      ...prev,
      company_name: company.name || prev.company_name,
      siret: company.siret || prev.siret,
      siren: company.siren || prev.siren,
      naf_code: company.nafCode || prev.naf_code,
      naf_label: company.nafLabel || prev.naf_label,
      sector: company.sector || prev.sector,
      region: company.region || prev.region,
      department: company.department || prev.department,
      city: company.city || prev.city,
      postal_code: company.postalCode || prev.postal_code,
      address: company.address || prev.address,
      employees: company.employeeRange || prev.employees,
      legal_form: company.legalForm || prev.legal_form,
      company_category: company.companyCategory || prev.company_category,
      year_created: company.creationDate
        ? (extractYear(company.creationDate)?.toString() || prev.year_created)
        : prev.year_created,
      // New fields
      convention_collective: company.conventionCollective || prev.convention_collective,
      dirigeants: company.dirigeants || prev.dirigeants,
      nombre_etablissements: company.nombreEtablissements || prev.nombre_etablissements,
      nombre_etablissements_ouverts: company.nombreEtablissementsOuverts || prev.nombre_etablissements_ouverts,
    }));

    setCompanyEnriched(true);

    // Fetch capital social in the background (not available in the free API)
    if (company.siren) {
      fetchCapitalSocial(company.siren).then((capitalSocial) => {
        if (capitalSocial) {
          setFormData((prev) => ({ ...prev, capital_social: capitalSocial }));
        }
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.company_name.trim()) {
      setError('Le nom de l\'entreprise est requis');
      return;
    }

    try {
      await onSubmit({
        company_name: formData.company_name.trim(),
        siret: formData.siret || null,
        siren: formData.siren || null,
        naf_code: formData.naf_code || null,
        naf_label: formData.naf_label || null,
        sector: formData.sector || null,
        sub_sector: formData.sub_sector || null,
        region: formData.region || null,
        department: formData.department || null,
        city: formData.city || null,
        postal_code: formData.postal_code || null,
        address: formData.address || null,
        employees: formData.employees || null,
        annual_turnover: formData.annual_turnover ? parseFloat(formData.annual_turnover) : null,
        year_created: formData.year_created ? parseInt(formData.year_created) : null,
        legal_form: formData.legal_form || null,
        company_category: formData.company_category || null,
        website_url: formData.website_url || null,
        description: formData.description || null,
        project_types: formData.project_types,
        // New fields
        convention_collective: formData.convention_collective?.length ? formData.convention_collective : null,
        dirigeants: formData.dirigeants?.length ? formData.dirigeants : null,
        nombre_etablissements: formData.nombre_etablissements,
        nombre_etablissements_ouverts: formData.nombre_etablissements_ouverts,
        capital_social: formData.capital_social,
      });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  const toggleProjectType = useCallback((type: string) => {
    setFormData((prev) => ({
      ...prev,
      project_types: prev.project_types.includes(type)
        ? prev.project_types.filter((t) => t !== type)
        : [...prev.project_types, type],
    }));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Company Search Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-slate-900">Rechercher votre entreprise</h3>
        </div>
        <p className="text-sm text-slate-600 mb-3">
          Recherchez par nom d'entreprise, SIREN ou SIRET pour pré-remplir automatiquement les informations
        </p>
        <CompanySearch
          onCompanySelect={handleCompanySelect}
          placeholder="Rechercher par nom, SIREN ou SIRET..."
          initialValue={initialData.company_name || ''}
        />

        {companyEnriched && formData.siret && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            <span>Entreprise identifiée - SIRET: {formData.siret}</span>
          </div>
        )}
      </div>

      {/* Company Name (can be edited manually) */}
      <div>
        <Label htmlFor="company_name" className="text-sm font-medium">
          Nom de l'entreprise *
        </Label>
        <Input
          id="company_name"
          value={formData.company_name}
          onChange={handleFieldChange('company_name')}
          placeholder="Ma Startup SAS"
          className="mt-1"
          required
        />
      </div>

      {/* SIRET / NAF Info (read-only if enriched) */}
      {formData.siret && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-slate-500">SIRET</Label>
            <p className="mt-1 text-slate-900 bg-slate-50 px-3 py-2 rounded-md text-sm">
              {formData.siret}
            </p>
          </div>
          {formData.naf_label && (
            <div>
              <Label className="text-sm font-medium text-slate-500">Activité (NAF)</Label>
              <p className="mt-1 text-slate-900 bg-slate-50 px-3 py-2 rounded-md text-sm truncate">
                {formData.naf_label}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Region */}
      <div>
        <Label htmlFor="region" className="text-sm font-medium">
          Région
</Label>
        <Select
          value={formData.region}
          onValueChange={handleSelectChange('region')}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Sélectionnez une région" />
          </SelectTrigger>
          <SelectContent>
            {FRENCH_REGIONS.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City and Postal Code (if enriched) */}
      {(formData.city || formData.postal_code) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.city && (
            <div>
              <Label className="text-sm font-medium text-slate-500">Ville</Label>
              <p className="mt-1 text-slate-900 bg-slate-50 px-3 py-2 rounded-md text-sm">
                {formData.city}
              </p>
            </div>
          )}
          {formData.postal_code && (
            <div>
              <Label className="text-sm font-medium text-slate-500">Code postal</Label>
              <p className="mt-1 text-slate-900 bg-slate-50 px-3 py-2 rounded-md text-sm">
                {formData.postal_code}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sector */}
      <div>
        <Label htmlFor="sector" className="text-sm font-medium">
          Secteur d'activité
        </Label>
        <Select
          value={formData.sector}
          onValueChange={handleSelectChange('sector')}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Sélectionnez un secteur" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_SECTORS.map((sector) => (
              <SelectItem key={sector.value} value={sector.value}>
                {sector.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Website URL */}
      <div>
        <Label htmlFor="website_url" className="text-sm font-medium">
          Site web
        </Label>
        <Input
          id="website_url"
          type="url"
          value={formData.website_url}
          onChange={handleFieldChange('website_url')}
          placeholder="https://www.mon-entreprise.fr"
          className="mt-1"
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          Description de l'entreprise
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={handleFieldChange('description')}
          placeholder="Décrivez votre activité, vos produits ou services..."
          className="mt-1 min-h-[100px]"
          rows={4}
        />
        <p className="text-xs text-slate-500 mt-1">
          Une bonne description aide à trouver des subventions plus pertinentes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Employees */}
        <div>
          <Label htmlFor="employees" className="text-sm font-medium">
            Effectifs
          </Label>
          <Select
            value={formData.employees}
            onValueChange={handleSelectChange('employees')}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Nombre de salariés" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYEE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Legal Form */}
        <div>
          <Label htmlFor="legal_form" className="text-sm font-medium">
            Forme juridique
          </Label>
          <Select
            value={formData.legal_form}
            onValueChange={handleSelectChange('legal_form')}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {LEGAL_FORMS.map((form) => (
                <SelectItem key={form.value} value={form.value}>
                  {form.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Annual Turnover */}
        <div>
          <Label htmlFor="annual_turnover" className="text-sm font-medium">
            Chiffre d'affaires annuel
          </Label>
          <Input
            id="annual_turnover"
            type="number"
            value={formData.annual_turnover}
            onChange={handleFieldChange('annual_turnover')}
            placeholder="Ex: 500000"
            className="mt-1"
          />
        </div>

        {/* Year Created */}
        <div>
          <Label htmlFor="year_created" className="text-sm font-medium">
            Année de création
          </Label>
          <Input
            id="year_created"
            type="number"
            value={formData.year_created}
            onChange={handleFieldChange('year_created')}
            placeholder="Ex: 2020"
            min="1900"
            max={new Date().getFullYear()}
            className="mt-1"
          />
        </div>
      </div>

      {/* Company Category (if enriched) */}
      {formData.company_category && (
        <div>
          <Label className="text-sm font-medium text-slate-500">Catégorie d'entreprise</Label>
          <p className="mt-1 text-slate-900 bg-slate-50 px-3 py-2 rounded-md text-sm">
            {formData.company_category}
          </p>
        </div>
      )}

      {/* Project Types */}
      <div>
        <Label className="text-sm font-medium">Types de projets recherchés</Label>
        <p className="text-sm text-slate-500 mb-2">
          Sélectionnez les domaines qui vous intéressent
        </p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => toggleProjectType(type.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                formData.project_types.includes(type.value)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-4">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

export default ProfileForm;
