import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock,
  RefreshCw,
  Building2,
  Eye,
  Clock,
  Star,
  Check,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  FileText,
  Rocket,
  Loader2,
  X,
  Upload,
  Trash2,
  Circle,
  RotateCcw,
} from 'lucide-react';

type SimulationStep = 'choice' | 'form' | 'processing' | 'results';
type CompanyType = 'entreprise' | 'creation' | null;

/**
 * Demo page showing a full fake simulation walkthrough
 * Mirrors the exact UI of the landing page simulation modal
 */
const SubsidyDisplayDemo = () => {
  const [step, setStep] = useState<SimulationStep>('choice');
  const [companyType, setCompanyType] = useState<CompanyType>(null);
  const [formProgress, setFormProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Fake company profiles
  const fakeCompanyEntreprise = {
    name: 'GreenTech Solutions SAS',
    siret: '987 654 321 00012',
    sector: 'Conseil en stratégie environnementale',
    naf: '70.22Z - Conseil pour les affaires',
    region: 'Île-de-France',
    employees: '5-10 salariés',
    website: 'www.greentech-solutions.fr',
    description: 'Startup spécialisée dans le conseil en transition écologique pour les PME industrielles.',
  };

  const fakeCompanyCreation = {
    name: 'EcoMobilité Express',
    siret: '',
    sector: 'Transport et logistique',
    naf: '49.32Z - Transports de voyageurs',
    region: 'Auvergne-Rhône-Alpes',
    employees: '1-2 salariés',
    website: '',
    description: 'Création d\'une entreprise de transport écologique en véhicules électriques.',
  };

  const fakeCompany = companyType === 'creation' ? fakeCompanyCreation : fakeCompanyEntreprise;

  // Fake documents for demo
  const fakeDocuments = companyType === 'entreprise'
    ? [{ name: 'Kbis_GreenTech.pdf', size: 1.2 }]
    : [{ name: 'Business_Plan_EcoMobilite.pdf', size: 2.4 }];

  // Fake simulation results
  const fakeSubsidies = companyType === 'creation' ? [
    {
      id: '1',
      title: "ACRE - Aide aux Créateurs et Repreneurs d'Entreprise",
      funding_type: 'Exonération',
      agency: 'URSSAF',
      deadline: null,
    },
    {
      id: '2',
      title: "Prêt d'Honneur Création - Initiative France",
      funding_type: 'Prêt',
      agency: 'Initiative France',
      deadline: null,
    },
    {
      id: '3',
      title: "Bonus écologique véhicules utilitaires électriques",
      funding_type: 'Subvention',
      agency: 'Ministère Transition Écologique',
      deadline: '2026-12-31',
    },
    {
      id: '4',
      title: "Aide régionale à la création d'entreprise - AURA",
      funding_type: 'Subvention',
      agency: 'Région Auvergne-Rhône-Alpes',
      deadline: null,
    },
    {
      id: '5',
      title: "NACRE - Nouvel Accompagnement Création/Reprise",
      funding_type: 'Accompagnement',
      agency: 'France Travail',
      deadline: null,
    },
    {
      id: '6',
      title: "Prime à la conversion véhicules professionnels",
      funding_type: 'Subvention',
      agency: 'Ministère Transition Écologique',
      deadline: '2026-06-30',
    },
    {
      id: '7',
      title: "Garantie création Bpifrance",
      funding_type: 'Garantie',
      agency: 'Bpifrance',
      deadline: null,
    },
  ] : [
    {
      id: '1',
      title: "Aide à l'embauche en contrat de professionnalisation",
      funding_type: 'Subvention',
      agency: 'France Travail',
      deadline: null,
    },
    {
      id: '2',
      title: "Crédit d'Impôt Recherche (CIR) - Dépenses de R&D",
      funding_type: 'Crédit d\'impôt',
      agency: 'Ministère de la Recherche',
      deadline: '2026-12-31',
    },
    {
      id: '3',
      title: "Aide à la transformation numérique des PME - France Num",
      funding_type: 'Subvention',
      agency: 'BPI France',
      deadline: '2026-06-30',
    },
    {
      id: '4',
      title: "Prêt Croissance TPE/PME - Région Île-de-France",
      funding_type: 'Prêt',
      agency: 'Région Île-de-France',
      deadline: null,
    },
    {
      id: '5',
      title: "Diagnostic environnemental gratuit - ADEME",
      funding_type: 'Accompagnement',
      agency: 'ADEME',
      deadline: null,
    },
    {
      id: '6',
      title: "Bourse French Tech - Aide à l'innovation",
      funding_type: 'Subvention',
      agency: 'BPI France',
      deadline: '2026-09-15',
    },
    {
      id: '7',
      title: "Aide au conseil RH pour les TPE-PME",
      funding_type: 'Subvention',
      agency: 'DREETS',
      deadline: null,
    },
    {
      id: '8',
      title: "Subvention transition écologique entreprises",
      funding_type: 'Subvention',
      agency: 'ADEME',
      deadline: '2026-11-30',
    },
  ];

  const totalSubsidies = fakeSubsidies.length;
  const displayAmount = companyType === 'creation'
    ? 'Entre 15 000 et 50 000 EUR'
    : 'Entre 25 000 et 100 000 EUR';
  const categories = companyType === 'creation'
    ? ['Création', 'Mobilité verte', 'Financement']
    : ['Innovation', 'Numérique', 'Emploi', 'Environnement'];

  // Processing steps (matching landing page)
  const analysisSteps = [
    { icon: '🔍', title: 'Vérification du profil', description: 'Validation des informations entreprise' },
    { icon: '📊', title: 'Enrichissement des données', description: 'Récupération des données complémentaires' },
    { icon: '🏭', title: 'Analyse sectorielle', description: 'Identification des aides par secteur d\'activité' },
    { icon: '📍', title: 'Analyse géographique', description: 'Filtrage par région et commune' },
    { icon: '✓', title: 'Matching d\'éligibilité', description: 'Vérification des critères d\'éligibilité' },
    { icon: '🧮', title: 'Calcul des scores', description: 'Calcul des probabilités de succès' },
    { icon: '💰', title: 'Estimation des montants', description: 'Évaluation des montants potentiels' },
  ];

  // Handle company type selection
  const handleTypeSelection = (type: CompanyType) => {
    setCompanyType(type);
    setStep('form');
    setFormProgress(0);
  };

  // Auto-fill form animation
  useEffect(() => {
    if (step === 'form' && formProgress < 100) {
      const timer = setTimeout(() => {
        setFormProgress(prev => Math.min(prev + 5, 100));
      }, 100);
      return () => clearTimeout(timer);
    }
    if (step === 'form' && formProgress === 100) {
      const timer = setTimeout(() => {
        setStep('processing');
        setProcessingStep(0);
        setAnalysisProgress(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, formProgress]);

  // Processing animation
  useEffect(() => {
    if (step === 'processing' && processingStep < analysisSteps.length) {
      const stepProgress = ((processingStep + 1) / analysisSteps.length) * 100;

      // Animate progress bar
      const progressTimer = setInterval(() => {
        setAnalysisProgress(prev => {
          const target = stepProgress;
          if (prev < target) return Math.min(prev + 2, target);
          return prev;
        });
      }, 50);

      // Move to next step
      const stepTimer = setTimeout(() => {
        setProcessingStep(prev => prev + 1);
      }, 1500);

      return () => {
        clearInterval(progressTimer);
        clearTimeout(stepTimer);
      };
    }
    if (step === 'processing' && processingStep === analysisSteps.length) {
      const timer = setTimeout(() => {
        setStep('results');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [step, processingStep, analysisSteps.length]);

  // Reset demo
  const resetDemo = () => {
    setStep('choice');
    setCompanyType(null);
    setFormProgress(0);
    setProcessingStep(0);
    setAnalysisProgress(0);
  };

  // Truncate title helper
  const truncateTitle = (title: string, maxWords: number = 6) => {
    const words = title.split(/\s+/);
    if (words.length <= maxWords) return title;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  // Sectors list for creation form
  const sectors = [
    'Agriculture et agroalimentaire',
    'Artisanat',
    'Commerce et distribution',
    'Construction et BTP',
    'Culture et médias',
    'Énergie et environnement',
    'Finance et assurance',
    'Industrie manufacturière',
    'Numérique et tech',
    'Santé et médical',
    'Services aux entreprises',
    'Tourisme et hôtellerie',
    'Transport et logistique',
  ];

  // Regions list for creation form
  const regions = [
    'Auvergne-Rhône-Alpes',
    'Bourgogne-Franche-Comté',
    'Bretagne',
    'Centre-Val de Loire',
    'Corse',
    'Grand Est',
    'Hauts-de-France',
    'Île-de-France',
    'Normandie',
    'Nouvelle-Aquitaine',
    'Occitanie',
    'Pays de la Loire',
    'Provence-Alpes-Côte d\'Azur',
  ];

  // Group subsidies by agency for summary
  const groupedByAgency = fakeSubsidies.reduce((acc: Record<string, { subsidies: typeof fakeSubsidies, types: Set<string> }>, subsidy) => {
    const agency = subsidy.agency;
    if (!acc[agency]) {
      acc[agency] = { subsidies: [], types: new Set() };
    }
    acc[agency].subsidies.push(subsidy);
    acc[agency].types.add(subsidy.funding_type);
    return acc;
  }, {});

  const agencyGroups = Object.entries(groupedByAgency)
    .map(([agency, data]) => ({
      agency,
      count: data.subsidies.length,
      types: Array.from(data.types),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Demo Banner */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span><strong>Mode démonstration :</strong> Les données affichées sont fictives pour illustrer le parcours</span>
            </div>
            {step !== 'choice' && (
              <button
                onClick={resetDemo}
                className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Recommencer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container - Simulating the modal */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Modal Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {step === 'results' ? "Vos aides identifiées" :
                 step === 'processing' ? "Analyse en cours" :
                 !companyType ? "Création de profil" :
                 companyType === 'entreprise' ? "Création de profil - Entreprise" :
                 "Création de profil - Entreprise en création"}
              </h3>
            </div>
            <Link
              to="/"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </Link>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {/* Type Selection */}
            {step === 'choice' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <p className="text-center text-slate-500">Choisissez votre situation pour démarrer</p>

                {/* Option 1: Entreprise existante */}
                <button
                  onClick={() => handleTypeSelection('entreprise')}
                  className="w-full p-6 border-2 border-slate-200 rounded-xl text-left hover:border-blue-800 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-800 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-800">Entreprise</h4>
                      <p className="text-slate-500 text-sm mb-3">Vous avez déjà une entreprise immatriculée</p>
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
                  onClick={() => handleTypeSelection('creation')}
                  className="w-full p-6 border-2 border-slate-200 rounded-xl text-left hover:border-emerald-600 hover:bg-emerald-50/50 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600">Création / Reprise d'entreprise</h4>
                      <p className="text-slate-500 text-sm mb-3">Vous envisagez de créer ou reprendre une activité</p>
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

                {/* Value Proposition - Why this simulation matters */}
                <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-full mb-3">
                      <TrendingUp className="w-7 h-7 text-white" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-lg">
                      Découvrez combien d'aides vous pouvez obtenir
                    </h4>
                    <p className="text-slate-600 mt-2">
                      En moyenne, nos utilisateurs découvrent <strong className="text-blue-700">7 à 15 aides</strong> auxquelles ils ne pensaient pas être éligibles.
                    </p>
                  </div>

                  <div className="bg-white/70 rounded-lg p-4 mt-4">
                    <p className="text-sm text-slate-700 text-center">
                      <strong>Cette simulation gratuite vous révèle :</strong>
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-sm text-slate-700 border border-slate-200">
                        <Check className="w-4 h-4 text-emerald-600" />
                        Le nombre exact d'aides
                      </span>
                      <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-sm text-slate-700 border border-slate-200">
                        <Check className="w-4 h-4 text-emerald-600" />
                        Les catégories disponibles
                      </span>
                      <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-sm text-slate-700 border border-slate-200">
                        <Check className="w-4 h-4 text-emerald-600" />
                        Un aperçu des aides
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-3">
                      Vous pourrez ensuite choisir d'accéder aux détails complets (noms, montants, contacts) si les résultats vous intéressent.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Entreprise Form */}
            {step === 'form' && companyType === 'entreprise' && (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Company Search */}
                  <div>
                    <label className="block mb-2 font-semibold text-slate-900 text-sm">
                      Rechercher des entreprises françaises <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formProgress >= 20 ? fakeCompany.name : ''}
                        readOnly
                        placeholder="Nom d'entreprise, SIRET ou SIREN"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base bg-slate-50"
                      />
                      {formProgress < 20 && formProgress > 0 && (
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                          <div className="w-5 h-5 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>

                    {formProgress >= 20 && (
                      <div className="mt-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <Check className="w-4 h-4" />
                          <span className="font-semibold text-sm">Entreprise sélectionnée</span>
                        </div>
                        <p className="text-slate-700 text-sm mt-1">{fakeCompany.name}</p>
                        <p className="text-xs text-slate-500">SIRET: {fakeCompany.siret}</p>
                      </div>
                    )}
                  </div>

                  {/* Website */}
                  <div className={`transition-opacity duration-300 ${formProgress >= 40 ? 'opacity-100' : 'opacity-30'}`}>
                    <label className="block mb-2 font-semibold text-slate-900 text-sm">
                      Site web de l'entreprise <span className="text-slate-400 font-normal">(Recommandé)</span>
                    </label>
                    <input
                      type="text"
                      value={formProgress >= 50 ? fakeCompany.website : ''}
                      readOnly
                      placeholder="exemple.com"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base bg-slate-50"
                    />
                  </div>

                  {/* Description */}
                  <div className={`transition-opacity duration-300 ${formProgress >= 60 ? 'opacity-100' : 'opacity-30'}`}>
                    <label className="block mb-2 font-semibold text-slate-900 text-sm">
                      Description <span className="text-slate-400 font-normal">(Recommandé)</span>
                    </label>
                    <textarea
                      value={formProgress >= 70 ? fakeCompany.description : ''}
                      readOnly
                      placeholder="Brève description de vos activités commerciales..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base bg-slate-50 resize-none"
                    />
                  </div>

                  {/* Documents */}
                  <div className={`transition-opacity duration-300 ${formProgress >= 80 ? 'opacity-100' : 'opacity-30'}`}>
                    <label className="block mb-2 font-semibold text-slate-900 text-sm">
                      Documents <span className="text-slate-400 font-normal">(Recommandé)</span>
                    </label>
                    <p className="text-xs text-slate-500 mb-3">Ajoutez des documents pour enrichir votre profil</p>

                    <div className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-sm text-slate-500">Business plan, presentation, Kbis... (PDF, Word, max 10 Mo)</p>
                    </div>

                    {/* File list */}
                    {formProgress >= 90 && (
                      <div className="mt-3 space-y-2">
                        {fakeDocuments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-800" />
                              <span className="text-sm text-slate-700 truncate max-w-[200px]">{file.name}</span>
                              <span className="text-xs text-slate-400">({file.size} Mo)</span>
                            </div>
                            <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                              <Trash2 className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Étapes</span>
                      <span className="text-sm font-bold text-blue-800">
                        {Math.min(4, Math.floor(formProgress / 25))}/4
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`font-medium flex items-center gap-1.5 ${formProgress >= 20 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {formProgress >= 20 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} SIRET
                        </span>
                        <span className="text-red-500 text-xs">Obligatoire</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`font-medium flex items-center gap-1.5 ${formProgress >= 50 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {formProgress >= 50 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Site web
                        </span>
                        <span className="text-slate-400 text-xs">Recommandé</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`font-medium flex items-center gap-1.5 ${formProgress >= 70 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {formProgress >= 70 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Description
                        </span>
                        <span className="text-slate-400 text-xs">Recommandé</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`font-medium flex items-center gap-1.5 ${formProgress >= 90 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {formProgress >= 90 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Documents
                        </span>
                        <span className="text-slate-400 text-xs">Recommandé</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-800">
                      <span className="font-bold">Conseil :</span> Un profil complet peut doubler le nombre de subventions pertinentes trouvées.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Creation Form */}
            {step === 'form' && companyType === 'creation' && (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Company Name */}
                  <div className={`transition-opacity duration-300 ${formProgress >= 10 ? 'opacity-100' : 'opacity-50'}`}>
                    <label className="block mb-2 font-semibold text-slate-900 text-sm">
                      1. Nom prévu pour l'entreprise en création ou reprise <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formProgress >= 15 ? fakeCompany.name : ''}
                      readOnly
                      placeholder="Ex: EcoTech Solutions"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base bg-slate-50"
                    />
                  </div>

                  {/* Sector */}
                  <div className={`transition-opacity duration-300 ${formProgress >= 25 ? 'opacity-100' : 'opacity-30'}`}>
                    <label className="block mb-2 font-semibold text-slate-900 text-sm">
                      2. Secteur d'activité <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formProgress >= 35 ? fakeCompany.sector : ''}
                      disabled
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base bg-slate-50 appearance-none"
                    >
                      <option value="">Sélectionnez le secteur</option>
                      {sectors.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Region */}
                  <div className={`transition-opacity duration-300 ${formProgress >= 45 ? 'opacity-100' : 'opacity-30'}`}>
                    <label className="block mb-2 font-semibold text-slate-900 text-sm">
                      3. Région d'implantation <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formProgress >= 55 ? fakeCompany.region : ''}
                      disabled
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base bg-slate-50 appearance-none"
                    >
                      <option value="">Sélectionnez la région</option>
                      <option value="À déterminer">À déterminer</option>
                      {regions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Website */}
                  <div className={`transition-opacity duration-300 ${formProgress >= 65 ? 'opacity-100' : 'opacity-30'}`}>
                    <label className="block mb-2 font-semibold text-slate-900 text-sm">
                      4. Site web de l'entreprise <span className="text-slate-400 font-normal">(Recommandé)</span>
                    </label>
                    <input
                      type="text"
                      value=""
                      readOnly
                      placeholder="www.exemple.com"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base bg-slate-50"
                    />
                  </div>

                  {/* Description */}
                  <div className={`transition-opacity duration-300 ${formProgress >= 75 ? 'opacity-100' : 'opacity-30'}`}>
                    <label className="block mb-2 font-semibold text-slate-900 text-sm">
                      5. Description <span className="text-slate-400 font-normal">(Recommandé)</span>
                    </label>
                    <textarea
                      value={formProgress >= 85 ? fakeCompany.description : ''}
                      readOnly
                      placeholder="Brève description des activités commerciales..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base bg-slate-50 resize-none"
                    />
                  </div>

                  {/* Documents */}
                  <div className={`transition-opacity duration-300 ${formProgress >= 90 ? 'opacity-100' : 'opacity-30'}`}>
                    <label className="block mb-2 font-semibold text-slate-900 text-sm">
                      6. Documents <span className="text-slate-400 font-normal">(Recommandé)</span>
                    </label>
                    <p className="text-xs text-slate-500 mb-3">Ajoutez des documents pour enrichir le profil</p>

                    <div className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-sm text-slate-500">Business plan, presentation, Kbis... (PDF, Word, max 10 Mo)</p>
                    </div>

                    {formProgress >= 95 && (
                      <div className="mt-3 space-y-2">
                        {fakeDocuments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-800" />
                              <span className="text-sm text-slate-700 truncate max-w-[200px]">{file.name}</span>
                              <span className="text-xs text-slate-400">({file.size} Mo)</span>
                            </div>
                            <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                              <Trash2 className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Étapes</span>
                      <span className="text-sm font-bold text-blue-800">
                        {Math.min(6, Math.floor(formProgress / 16.67))}/6
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className={`font-medium flex items-center gap-1.5 ${formProgress >= 15 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {formProgress >= 15 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Nom de l'entreprise
                        </span>
                        <span className="text-red-500 text-xs ml-2">Obligatoire</span>
                      </div>
                      <div className="text-sm">
                        <span className={`font-medium flex items-center gap-1.5 ${formProgress >= 35 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {formProgress >= 35 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Secteur d'activité
                        </span>
                        <span className="text-red-500 text-xs ml-2">Obligatoire</span>
                      </div>
                      <div className="text-sm">
                        <span className={`font-medium flex items-center gap-1.5 ${formProgress >= 55 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {formProgress >= 55 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Région d'implantation
                        </span>
                        <span className="text-red-500 text-xs ml-2">Obligatoire</span>
                      </div>
                      <div className="text-sm">
                        <span className={`font-medium flex items-center gap-1.5 text-slate-400`}>
                          <Circle className="w-4 h-4" /> Site web
                        </span>
                        <span className="text-slate-400 text-xs ml-2">Recommandé</span>
                      </div>
                      <div className="text-sm">
                        <span className={`font-medium flex items-center gap-1.5 ${formProgress >= 85 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {formProgress >= 85 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Description
                        </span>
                        <span className="text-slate-400 text-xs ml-2">Recommandé</span>
                      </div>
                      <div className="text-sm">
                        <span className={`font-medium flex items-center gap-1.5 ${formProgress >= 95 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {formProgress >= 95 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Documents
                        </span>
                        <span className="text-slate-400 text-xs ml-2">Recommandé</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-800">
                      <span className="font-bold">Conseil :</span> Un profil complet peut doubler le nombre de subventions pertinentes trouvées.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Analyzing Animation */}
            {step === 'processing' && (
              <div className="py-8">
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
                      Étape {Math.min(processingStep + 1, analysisSteps.length)} sur {analysisSteps.length}
                    </span>
                  </div>
                </div>

                {/* Current Step */}
                <div className="max-w-lg mx-auto mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
                        {analysisSteps[Math.min(processingStep, analysisSteps.length - 1)]?.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 mb-1">
                          {analysisSteps[Math.min(processingStep, analysisSteps.length - 1)]?.title}
                        </h4>
                        <p className="text-slate-600 text-sm">
                          {analysisSteps[Math.min(processingStep, analysisSteps.length - 1)]?.description}
                        </p>
                      </div>
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Steps Timeline */}
                <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Étapes de l'analyse</h4>
                  <div className="space-y-2">
                    {analysisSteps.map((s, index) => (
                      <div key={index} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                        index === processingStep ? 'bg-blue-50 border border-blue-200' :
                        index < processingStep ? 'bg-emerald-50/50' : ''
                      }`}>
                        {/* Status Icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                          index < processingStep ? 'bg-emerald-500 text-white' :
                          index === processingStep ? 'bg-blue-600 text-white' :
                          'bg-slate-200 text-slate-400'
                        }`}>
                          {index < processingStep ? (
                            <Check className="w-4 h-4" />
                          ) : index === processingStep ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className="text-xs">{index + 1}</span>
                          )}
                        </div>

                        {/* Step Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{s.icon}</span>
                            <span className={`text-sm font-medium truncate ${
                              index < processingStep ? 'text-emerald-700' :
                              index === processingStep ? 'text-blue-800' :
                              'text-slate-400'
                            }`}>
                              {s.title}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex-shrink-0">
                          {index < processingStep && (
                            <span className="text-xs text-emerald-600 font-medium">Terminé</span>
                          )}
                          {index === processingStep && (
                            <span className="text-xs text-blue-600 font-medium animate-pulse">En cours...</span>
                          )}
                          {index > processingStep && (
                            <span className="text-xs text-slate-400">En attente</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Don't close warning */}
                <div className="max-w-lg mx-auto mt-4 text-center">
                  <p className="text-slate-400 text-xs">
                    Ne fermez pas cette fenêtre pendant l'analyse
                  </p>
                </div>
              </div>
            )}

            {/* Results View */}
            {step === 'results' && (
              <div className="space-y-6">
                {/* Company Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{fakeCompany.name}</p>
                      <p className="text-sm text-slate-500">{fakeCompany.sector}</p>
                    </div>
                  </div>
                </div>

                {/* Summary Banner */}
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-6 h-6 text-amber-300" />
                    <h3 className="text-xl font-bold">Résultats de votre simulation</h3>
                  </div>
                  <div className="flex justify-center gap-4">
                    <div className="bg-white/20 rounded-lg p-4 text-center min-w-[120px]">
                      <div className="text-3xl font-extrabold">{totalSubsidies}</div>
                      <div className="text-sm opacity-90">Aides identifiées</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4 text-center min-w-[120px]">
                      <div className="text-3xl font-extrabold">{displayAmount.split(' ')[1]}</div>
                      <div className="text-sm opacity-90">Montant potentiel</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4 text-center min-w-[120px]">
                      <div className="text-3xl font-extrabold">{categories.length}</div>
                      <div className="text-sm opacity-90">Catégories</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {categories.map((cat) => (
                      <span key={cat} className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Category Summary by Agency */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-slate-900">Résumé par organisme</h4>
                  </div>
                  <div className="space-y-3">
                    {agencyGroups.map((group, index) => (
                      <div key={index} className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-bold text-slate-900 mb-1">
                              {group.count} {group.types.join(', ')} {group.agency}
                            </h5>
                            <p className="text-sm text-slate-500">
                              Financement et accompagnement
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded text-xs font-medium">
                              <Lock className="w-3 h-3" />
                              <span>Voir détails</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visible Preview Cards */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-slate-900">Aides correspondant à votre profil</h4>
                    <span className="text-sm text-slate-500">Aperçu limité - 3 sur {totalSubsidies}</span>
                  </div>

                  <div className="space-y-3">
                    {fakeSubsidies.slice(0, 3).map((subsidy) => (
                      <div key={subsidy.id} className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-bold text-slate-900">{truncateTitle(subsidy.title)}</h5>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {subsidy.funding_type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Locked details */}
                            <div className="flex items-center gap-2 text-slate-400">
                              <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs">
                                <Lock className="w-3 h-3" />
                                <span>Montant</span>
                              </div>
                              {subsidy.deadline ? (
                                <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(subsidy.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs">
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Permanent</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blurred/Locked Cards */}
                {fakeSubsidies.length > 3 && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white z-10 pointer-events-none" />
                    <div className="space-y-3 blur-[2px]">
                      {fakeSubsidies.slice(3, 6).map((subsidy) => (
                        <div key={subsidy.id} className="bg-slate-100 border-2 border-slate-200 rounded-xl p-4 opacity-60">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-bold text-slate-600">{truncateTitle(subsidy.title)}</h5>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span>{subsidy.funding_type}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Unlock CTA Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-white via-white to-transparent pt-16 pb-2">
                      <div className="text-center">
                        <Lock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                        <h4 className="text-lg font-bold text-slate-900 mb-1">
                          +{fakeSubsidies.length - 3} autres aides identifiées
                        </h4>
                        <p className="text-slate-500 text-sm mb-4">
                          Débloquez l'accès complet : montants, deadlines, contacts et guide de demande
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upgrade CTA */}
                <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-bold text-slate-900 mb-2">
                      Débloquez toutes vos opportunités
                    </h4>
                    <p className="text-slate-600">
                      Accédez aux détails complets des {totalSubsidies} aides identifiées pour votre entreprise
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Découverte Option */}
                    <div className="bg-white rounded-xl p-5 border-2 border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-slate-900">Découverte</h5>
                        <span className="text-2xl font-extrabold text-blue-800">49 EUR</span>
                      </div>
                      <ul className="space-y-2 text-sm text-slate-600 mb-4">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          Accès 30 jours
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          Tous les détails des aides
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          Rapport PDF complet
                        </li>
                      </ul>
                      <button className="w-full py-2.5 border-2 border-blue-800 text-blue-800 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                        Choisir Découverte
                      </button>
                    </div>

                    {/* Business Option */}
                    <div className="bg-white rounded-xl p-5 border-2 border-blue-800 shadow-lg shadow-blue-800/10 relative">
                      <div className="absolute -top-3 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                        RECOMMANDÉ
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-slate-900">Business</h5>
                        <span className="text-2xl font-extrabold text-blue-800">149 EUR<span className="text-sm font-normal text-slate-500">/an</span></span>
                      </div>
                      <ul className="space-y-2 text-sm text-slate-600 mb-4">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          Tout Découverte inclus
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          Moteur de recherche (10 000+ aides)
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          Alertes email personnalisées
                        </li>
                      </ul>
                      <button className="w-full py-2.5 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-800/20 hover:-translate-y-0.5 transition-all">
                        Choisir Business
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-xs text-slate-500 mt-4">
                    Paiement sécurisé par Stripe
                  </p>
                </div>

                {/* Close button */}
                <div className="text-center">
                  <Link
                    to="/"
                    className="text-slate-500 hover:text-slate-700 text-sm underline"
                  >
                    Fermer et revenir à l'accueil
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer - Form step only */}
          {step === 'form' && formProgress === 100 && (
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  setCompanyType(null);
                  setStep('choice');
                  setFormProgress(0);
                }}
                className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-800/20 flex items-center justify-center gap-2"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                Création du profil...
              </button>
            </div>
          )}
        </div>

        {/* Info box at bottom */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-800 text-sm">
            <Eye className="w-4 h-4" />
            <span>Cette démonstration reproduit exactement le parcours de simulation réel avec des données fictives.</span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            Lancer ma vraie simulation
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubsidyDisplayDemo;
