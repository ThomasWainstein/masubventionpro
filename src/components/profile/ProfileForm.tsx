import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import {
  MaSubventionProProfile,
  FRENCH_REGIONS,
  EMPLOYEE_RANGES,
  LEGAL_FORMS,
  PROJECT_TYPES,
} from '@/types';

interface ProfileFormProps {
  initialData?: Partial<MaSubventionProProfile>;
  onSubmit: (data: Partial<MaSubventionProProfile>) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function ProfileForm({
  initialData = {},
  onSubmit,
  submitLabel = 'Enregistrer',
  isLoading = false,
}: ProfileFormProps) {
  const [formData, setFormData] = useState({
    company_name: initialData.company_name || '',
    sector: initialData.sector || '',
    region: initialData.region || '',
    employees: initialData.employees || '',
    annual_turnover: initialData.annual_turnover?.toString() || '',
    year_created: initialData.year_created?.toString() || '',
    legal_form: initialData.legal_form || '',
    project_types: initialData.project_types || [],
  });

  const [error, setError] = useState<string | null>(null);

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
        sector: formData.sector || null,
        region: formData.region || null,
        employees: formData.employees || null,
        annual_turnover: formData.annual_turnover ? parseFloat(formData.annual_turnover) : null,
        year_created: formData.year_created ? parseInt(formData.year_created) : null,
        legal_form: formData.legal_form || null,
        project_types: formData.project_types,
      });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    }
  };

  const toggleProjectType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      project_types: prev.project_types.includes(type)
        ? prev.project_types.filter((t) => t !== type)
        : [...prev.project_types, type],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Company Name */}
      <div>
        <Label htmlFor="company_name" className="text-sm font-medium">
          Nom de l'entreprise *
        </Label>
        <Input
          id="company_name"
          value={formData.company_name}
          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          placeholder="Ma Startup SAS"
          className="mt-1"
          required
        />
      </div>

      {/* Region */}
      <div>
        <Label htmlFor="region" className="text-sm font-medium">
          Region
        </Label>
        <Select
          value={formData.region}
          onValueChange={(value) => setFormData({ ...formData, region: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Selectionnez une region" />
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

      {/* Sector */}
      <div>
        <Label htmlFor="sector" className="text-sm font-medium">
          Secteur d'activite
        </Label>
        <Input
          id="sector"
          value={formData.sector}
          onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
          placeholder="Ex: Commerce, Industrie, Services..."
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Employees */}
        <div>
          <Label htmlFor="employees" className="text-sm font-medium">
            Effectifs
          </Label>
          <Select
            value={formData.employees}
            onValueChange={(value) => setFormData({ ...formData, employees: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Nombre de salaries" />
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
            onValueChange={(value) => setFormData({ ...formData, legal_form: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selectionnez" />
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
            onChange={(e) => setFormData({ ...formData, annual_turnover: e.target.value })}
            placeholder="Ex: 500000"
            className="mt-1"
          />
        </div>

        {/* Year Created */}
        <div>
          <Label htmlFor="year_created" className="text-sm font-medium">
            Annee de creation
          </Label>
          <Input
            id="year_created"
            type="number"
            value={formData.year_created}
            onChange={(e) => setFormData({ ...formData, year_created: e.target.value })}
            placeholder="Ex: 2020"
            min="1900"
            max={new Date().getFullYear()}
            className="mt-1"
          />
        </div>
      </div>

      {/* Project Types */}
      <div>
        <Label className="text-sm font-medium">Types de projets recherches</Label>
        <p className="text-sm text-slate-500 mb-2">
          Selectionnez les domaines qui vous interessent
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
