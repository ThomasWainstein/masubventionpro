import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  ArrowLeft,
  LogOut,
  ArrowRight,
  Rocket,
  Check,
  Circle,
  Search,
  MapPin,
  BarChart3,
  Factory,
  Bot,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { FRENCH_REGIONS, BUSINESS_SECTORS } from '@/types';
import { searchCompanies, CompanySearchResult } from '@/lib/companySearch';

type ProfileType = 'entreprise' | 'creation' | null;
type WizardStep = 'type' | 'company' | 'details' | 'analyzing' | 'complete';

interface ProfileData {
  companyName: string;
  siret: string;
  siren: string;
  nafCode: string;
  nafLabel: string;
  sector: string;
  region: string;
  department: string;
  city: string;
  postalCode: string;
  address: string;
  employees: string;
  legalForm: string;
  companyCategory: string;
  yearCreated: string;
  website: string;
  description: string;
}

const initialProfileData: ProfileData = {
  companyName: '',
  siret: '',
  siren: '',
  nafCode: '',
  nafLabel: '',
  sector: '',
  region: '',
  department: '',
  city: '',
  postalCode: '',
  address: '',
  employees: '',
  legalForm: '',
  companyCategory: '',
  yearCreated: '',
  website: '',
  description: '',
};

// Analysis steps with timing
const analysisSteps = [
  {
    title: 'Vérification de votre profil',
    description: 'Nous validons les informations de votre entreprise...',
    duration: 800,
    icon: <Search className="w-5 h-5" />,
  },
  {
    title: 'Enrichissement des données',
    description: 'Récupération des données complémentaires...',
    duration: 1000,
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    title: 'Analyse sectorielle',
    description: 'Identification des dispositifs spécifiques à votre secteur...',
    duration: 1200,
    icon: <Factory className="w-5 h-5" />,
  },
  {
    title: 'Analyse géographique',
    description: 'Recherche des aides régionales et locales...',
    duration: 1000,
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    title: 'Configuration du matching IA',
    description: 'Préparation de votre profil pour les recommandations...',
    duration: 800,
    icon: <Bot className="w-5 h-5" />,
  },
  {
    title: 'Finalisation',
    description: 'Enregistrement de votre profil...',
    duration: 600,
    icon: <ClipboardList className="w-5 h-5" />,
  },
];

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createProfile } = useProfile();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('type');
  const [profileType, setProfileType] = useState<ProfileType>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    ...initialProfileData,
    companyName: user?.user_metadata?.company_name || '',
  });

  // Company search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [companySelected, setCompanySelected] = useState(false);

  // Analysis state
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [, setIsLoading] = useState(false);

  // Handle company search
  const handleSearch = useCallback(async () => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchCompanies(searchQuery.trim(), 5);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Handle company selection
  const handleCompanySelect = useCallback((company: CompanySearchResult) => {
    setProfileData((prev) => ({
      ...prev,
      companyName: company.name,
      siret: company.siret,
      siren: company.siren,
      nafCode: company.nafCode,
      nafLabel: company.nafLabel,
      sector: company.sector,
      region: company.region,
      department: company.department,
      city: company.city,
      postalCode: company.postalCode,
      address: company.address,
      employees: company.employeeRange,
      legalForm: company.legalForm,
      companyCategory: company.companyCategory,
      yearCreated: company.creationDate ? company.creationDate.substring(0, 4) : '',
    }));
    setSearchQuery(company.name);
    setSearchResults([]);
    setCompanySelected(true);
  }, []);

  // Handle profile type selection
  const handleTypeSelect = (type: ProfileType) => {
    setProfileType(type);
    setStep('company');
  };

  // Calculate completion for sidebar
  const getCompletion = () => {
    let count = 0;
    if (profileData.siret || profileData.companyName) count++;
    if (profileData.region) count++;
    if (profileData.website) count++;
    if (profileData.description) count++;
    return count;
  };

  // Run analysis animation
  const runAnalysis = async () => {
    setStep('analyzing');
    setAnalysisStep(0);
    setAnalysisProgress(0);

    const progressPerStep = 100 / analysisSteps.length;

    for (let i = 0; i < analysisSteps.length; i++) {
      setAnalysisStep(i);
      await new Promise((resolve) => setTimeout(resolve, analysisSteps[i].duration));
      setAnalysisProgress((i + 1) * progressPerStep);
    }

    // Create profile after analysis
    setIsLoading(true);
    try {
      await createProfile({
        company_name: profileData.companyName,
        siret: profileData.siret || null,
        siren: profileData.siren || null,
        naf_code: profileData.nafCode || null,
        naf_label: profileData.nafLabel || null,
        sector: profileData.sector || null,
        region: profileData.region || null,
        department: profileData.department || null,
        city: profileData.city || null,
        postal_code: profileData.postalCode || null,
        address: profileData.address || null,
        employees: profileData.employees || null,
        legal_form: profileData.legalForm || null,
        company_category: profileData.companyCategory || null,
        year_created: profileData.yearCreated ? parseInt(profileData.yearCreated) : null,
        website_url: profileData.website || null,
        description: profileData.description || null,
        project_types: profileType === 'creation' ? ['creation'] : [],
      });
      navigate('/app');
    } catch (error) {
      console.error('Error creating profile:', error);
      setStep('details');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!profileData.companyName.trim()) {
      return;
    }
    runAnalysis();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const goBack = () => {
    if (step === 'company') {
      setStep('type');
      setProfileType(null);
    } else if (step === 'details') {
      setStep('company');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4">
      <Helmet>
        <title>Configuration du profil - MaSubventionPro</title>
      </Helmet>

      {/* Top navigation */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="text-white/70 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Accueil</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {step === 'type' && 'Configurez votre profil entreprise'}
            {step === 'company' && (profileType === 'entreprise' ? 'Recherchez votre entreprise' : 'Décrivez votre projet')}
            {step === 'details' && 'Complétez votre profil'}
            {step === 'analyzing' && 'Analyse en cours'}
          </h1>
          <p className="text-slate-400">
            {step === 'type' && 'Ces informations nous permettront de vous proposer les aides les plus pertinentes'}
            {step === 'company' && (profileType === 'entreprise' ? 'Nous récupérons automatiquement vos informations' : 'Quelques informations sur votre future entreprise')}
            {step === 'details' && 'Ces informations améliorent la pertinence des recommandations'}
            {step === 'analyzing' && 'Nous préparons votre profil personnalisé'}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Step 1: Type Selection */}
          {step === 'type' && (
            <div className="p-8">
              <p className="text-center text-slate-500 mb-6">Choisissez votre situation</p>

              <div className="space-y-4 max-w-lg mx-auto">
                {/* Option 1: Entreprise existante */}
                <button
                  onClick={() => handleTypeSelect('entreprise')}
                  className="w-full p-6 border-2 border-slate-200 rounded-xl text-left hover:border-blue-800 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-800 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-800">
                        Entreprise
                      </h4>
                      <p className="text-slate-500 text-sm mb-3">
                        Vous avez déjà une entreprise immatriculée
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Enrichissement automatique SIRET</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Données pré-remplies</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-800 transition-colors mt-1" />
                  </div>
                </button>

                {/* Option 2: Creation / Reprise */}
                <button
                  onClick={() => handleTypeSelect('creation')}
                  className="w-full p-6 border-2 border-slate-200 rounded-xl text-left hover:border-emerald-600 hover:bg-emerald-50/50 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600">
                        Création / Reprise d'entreprise
                      </h4>
                      <p className="text-slate-500 text-sm mb-3">
                        Vous envisagez de créer ou reprendre une activité
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Aides à la création incluses</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Accompagnement personnalisé</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors mt-1" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Company Search / Manual Entry */}
          {step === 'company' && (
            <div className="p-8">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Back button */}
                  <button
                    onClick={goBack}
                    className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                  </button>

                  {profileType === 'entreprise' ? (
                    <>
                      {/* Company Search */}
                      <div>
                        <Label className="text-sm font-semibold text-slate-900">
                          Rechercher des entreprises françaises <span className="text-red-500">*</span>
                        </Label>
                        <div className="mt-2 flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCompanySelected(false);
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                              placeholder="Nom d'entreprise, SIRET ou SIREN"
                              className={companySelected ? 'border-emerald-500 bg-emerald-50' : ''}
                            />
                          </div>
                          <Button onClick={handleSearch} disabled={isSearching}>
                            {isSearching ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                          <div className="mt-2 border-2 border-slate-200 rounded-lg overflow-hidden">
                            {searchResults.map((company) => (
                              <button
                                key={company.siren}
                                onClick={() => handleCompanySelect(company)}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                              >
                                <p className="font-semibold text-slate-900">{company.name}</p>
                                <p className="text-sm text-slate-500">
                                  {company.siret} - {company.city}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}

                        {companySelected && profileData.siret && (
                          <div className="mt-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-emerald-700">
                              <Check className="w-4 h-4" />
                              <span className="font-semibold text-sm">Entreprise sélectionnée</span>
                            </div>
                            <p className="text-slate-700 text-sm mt-1">{profileData.companyName}</p>
                            <p className="text-xs text-slate-500">SIRET: {profileData.siret}</p>
                            {profileData.nafLabel && (
                              <p className="text-xs text-slate-500 mt-1">{profileData.nafLabel}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Manual Entry for Creation */}
                      <div>
                        <Label className="text-sm font-semibold text-slate-900">
                          Nom de votre future entreprise <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={profileData.companyName}
                          onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                          placeholder="Ma Future Entreprise"
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-slate-900">Région</Label>
                        <Select
                          value={profileData.region}
                          onValueChange={(value) => setProfileData({ ...profileData, region: value })}
                        >
                          <SelectTrigger className="mt-2">
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

                      <div>
                        <Label className="text-sm font-semibold text-slate-900">Secteur d'activité</Label>
                        <Select
                          value={profileData.sector}
                          onValueChange={(value) => setProfileData({ ...profileData, sector: value })}
                        >
                          <SelectTrigger className="mt-2">
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
                    </>
                  )}

                  {/* Continue button */}
                  <Button
                    onClick={() => setStep('details')}
                    disabled={!profileData.companyName && !companySelected}
                    className="w-full"
                  >
                    Continuer
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Étapes</span>
                      <span className="text-sm font-bold text-blue-800">{getCompletion()}/4</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`font-medium flex items-center gap-1.5 ${
                            profileData.siret || profileData.companyName ? 'text-emerald-600' : 'text-slate-500'
                          }`}
                        >
                          {profileData.siret || profileData.companyName ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}{' '}
                          {profileType === 'entreprise' ? 'SIRET' : 'Nom'}
                        </span>
                        <span className="text-red-500 text-xs">Obligatoire</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`font-medium flex items-center gap-1.5 ${
                            profileData.region ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {profileData.region ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Region
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`font-medium flex items-center gap-1.5 ${
                            profileData.website ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {profileData.website ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Site web
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`font-medium flex items-center gap-1.5 ${
                            profileData.description ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {profileData.description ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}{' '}
                          Description
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-800 text-sm mb-2">Pourquoi ces infos ?</h4>
                    <p className="text-xs text-slate-600">
                      Plus votre profil est complet, plus nos recommandations d'aides seront pertinentes et
                      personnalisées.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Additional Details */}
          {step === 'details' && (
            <div className="p-8">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Back button */}
                  <button
                    onClick={goBack}
                    className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                  </button>

                  {/* Selected company summary */}
                  {profileData.siret && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-emerald-600" />
                        <div>
                          <p className="font-semibold text-slate-900">{profileData.companyName}</p>
                          <p className="text-sm text-slate-500">
                            SIRET: {profileData.siret} | {profileData.city}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Region (if not already set) */}
                  {!profileData.region && (
                    <div>
                      <Label className="text-sm font-semibold text-slate-900">Région</Label>
                      <Select
                        value={profileData.region}
                        onValueChange={(value) => setProfileData({ ...profileData, region: value })}
                      >
                        <SelectTrigger className="mt-2">
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
                  )}

                  {/* Website */}
                  <div>
                    <Label className="text-sm font-semibold text-slate-900">
                      Site web de l'entreprise{' '}
                      <span className="text-slate-400 font-normal">(Recommandé)</span>
                    </Label>
                    <Input
                      value={profileData.website}
                      onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                      placeholder="https://www.exemple.com"
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Notre IA analyse votre site pour améliorer les recommandations
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-sm font-semibold text-slate-900">
                      Description de l'entreprise{' '}
                      <span className="text-slate-400 font-normal">(Recommandé)</span>
                    </Label>
                    <Textarea
                      value={profileData.description}
                      onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                      placeholder="Décrivez votre activité, vos produits ou services, vos projets..."
                      rows={4}
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Une bonne description aide à trouver des subventions plus pertinentes
                    </p>
                  </div>

                  {/* Submit button */}
                  <Button onClick={handleSubmit} disabled={!profileData.companyName} className="w-full" size="lg">
                    Créer mon profil
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Progression</span>
                      <span className="text-sm font-bold text-blue-800">{getCompletion()}/4</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`font-medium flex items-center gap-1.5 ${
                            profileData.siret || profileData.companyName ? 'text-emerald-600' : 'text-slate-500'
                          }`}
                        >
                          {profileData.siret || profileData.companyName ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}{' '}
                          Entreprise
                        </span>
                        <span className="text-emerald-600 text-xs">Complété</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`font-medium flex items-center gap-1.5 ${
                            profileData.region ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {profileData.region ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Region
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`font-medium flex items-center gap-1.5 ${
                            profileData.website ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {profileData.website ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Site web
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`font-medium flex items-center gap-1.5 ${
                            profileData.description ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {profileData.description ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}{' '}
                          Description
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info cards */}
                  {profileData.nafLabel && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-semibold text-slate-700 text-sm mb-2 flex items-center gap-2">
                        <Factory className="w-4 h-4" /> Activité détectée
                      </h4>
                      <p className="text-xs text-slate-600">{profileData.nafLabel}</p>
                    </div>
                  )}

                  {profileData.region && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-semibold text-slate-700 text-sm mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Localisation
                      </h4>
                      <p className="text-xs text-slate-600">
                        {profileData.city && `${profileData.city}, `}
                        {profileData.region}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Analyzing */}
          {step === 'analyzing' && (
            <div className="p-8 py-12">
              {/* Progress Bar */}
              <div className="max-w-lg mx-auto mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">Progression globale</span>
                  <span className="text-sm font-bold text-blue-800">{Math.round(analysisProgress)}%</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">
                    Étape {analysisStep + 1} sur {analysisSteps.length}
                  </span>
                </div>
              </div>

              {/* Current Step */}
              <div className="max-w-lg mx-auto mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
                      {analysisSteps[analysisStep]?.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 mb-1">{analysisSteps[analysisStep]?.title}</h4>
                      <p className="text-slate-600 text-sm">{analysisSteps[analysisStep]?.description}</p>
                    </div>
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  </div>
                </div>
              </div>

              {/* Steps Timeline */}
              <div className="max-w-lg mx-auto bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Étapes de l'analyse</h4>
                <div className="space-y-2">
                  {analysisSteps.map((stepItem, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                        index === analysisStep
                          ? 'bg-blue-50 border border-blue-200'
                          : index < analysisStep
                          ? 'bg-emerald-50/50'
                          : ''
                      }`}
                    >
                      {/* Status Icon */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                          index < analysisStep
                            ? 'bg-emerald-500 text-white'
                            : index === analysisStep
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {index < analysisStep ? (
                          <Check className="w-4 h-4" />
                        ) : index === analysisStep ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="text-xs">{index + 1}</span>
                        )}
                      </div>

                      {/* Step Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">{stepItem.icon}</span>
                          <span
                            className={`text-sm font-medium truncate ${
                              index < analysisStep
                                ? 'text-emerald-700'
                                : index === analysisStep
                                ? 'text-blue-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {stepItem.title}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        {index < analysisStep && (
                          <span className="text-xs text-emerald-600 font-medium">Terminé</span>
                        )}
                        {index === analysisStep && (
                          <span className="text-xs text-blue-600 font-medium animate-pulse">En cours...</span>
                        )}
                        {index > analysisStep && <span className="text-xs text-slate-400">En attente</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Don't close warning */}
              <div className="max-w-lg mx-auto mt-4 text-center">
                <p className="text-slate-400 text-xs">Ne fermez pas cette fenêtre pendant l'analyse</p>
              </div>
            </div>
          )}
        </div>

        {/* Skip option (only on first steps) */}
        {(step === 'type' || step === 'company' || step === 'details') && (
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/app')}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Passer cette étape et compléter plus tard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileSetupPage;
