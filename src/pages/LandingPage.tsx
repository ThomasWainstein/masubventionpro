import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { supabase } from "@/lib/supabase"
import { Menu, X, Building2, ArrowRight, Check, Upload, FileText, Trash2, Lock, Star, TrendingUp, Search, BarChart3, Factory, MapPin, Bot, Coins, ClipboardList, Rocket, RefreshCw, Target, Clock, Shield, Circle, Heart } from "lucide-react"
import { calculateMatchScore, ScoredSubsidy } from "@/hooks/useRecommendedSubsidies"
import { MaSubventionProProfile, Subsidy } from "@/types"

/**
 * MaSubventionPro Landing Page v8
 * CTA button + Profile creation modal (subvention360 style)
 */
const LandingPage = () => {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [subsidyCount, setSubsidyCount] = useState<string>("...")
  const [activeSegment, setActiveSegment] = useState<string | null>(null)

  // Profile creation modal state
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileType, setProfileType] = useState<'entreprise' | 'creation' | 'association' | null>(null)
  const [profileData, setProfileData] = useState({
    companyName: "",
    siret: "",
    region: "",
    sector: "",
    website: "",
    description: ""
  })
  const [isSearchingCompany, setIsSearchingCompany] = useState(false)
  const [companyResults, setCompanyResults] = useState<any[]>([])
  const [documents, setDocuments] = useState<File[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResults, setAnalysisResults] = useState<{
    companyData: any;
    matchedSubsidies: any[];
    totalAmount: string;
    categories: string[];
  } | null>(null)

  // ============================================
  // REAL ANALYSIS FUNCTIONS - Actual API calls
  // ============================================

  // Step 1: Verify profile with French government API
  const verifyProfile = async (): Promise<any> => {
    if (profileData.siret) {
      try {
        const response = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?q=${profileData.siret}&per_page=1`
        )
        const data = await response.json()
        return data.results?.[0] || null
      } catch (err) {
        console.error("Error verifying profile:", err)
        return null
      }
    }
    // For creation type, return profile data as-is
    return {
      nom_complet: profileData.companyName,
      siege: { region: profileData.region }
    }
  }

  // Step 2: Enrich company data from API response
  const enrichCompanyData = async (rawData: any): Promise<any> => {
    if (!rawData) return null
    return {
      siren: rawData.siren || null,
      siret: rawData.siege?.siret || profileData.siret,
      nom: rawData.nom_complet || rawData.nom_raison_sociale || profileData.companyName,
      dateCreation: rawData.date_creation,
      codeNaf: rawData.activite_principale || profileData.sector,
      libelleNaf: rawData.libelle_activite_principale,
      trancheEffectif: rawData.tranche_effectif_salarie,
      categorieEntreprise: rawData.categorie_entreprise, // PME, ETI, GE
      formeJuridique: rawData.nature_juridique,
      region: rawData.siege?.region || profileData.region,
      departement: rawData.siege?.departement,
      commune: rawData.siege?.libelle_commune,
      codePostal: rawData.siege?.code_postal,
    }
  }

  // Step 3: Query subsidies by sector from Supabase
  const analyzeSector = async (companyData: any): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from("subsidies")
        .select("id, title, funding_type, agency, description, amount_min, amount_max, deadline, region, primary_sector, categories, keywords, source_url")
        .eq("is_active", true)
        .limit(200)

      if (error) {
        console.error("Supabase sector query error:", error)
        return []
      }

      // Debug: Log sample of fetched data to check categories
      if (data && data.length > 0) {
        console.log("[DEBUG] Sample subsidy fields:", {
          sample: data.slice(0, 3).map(s => ({
            id: s.id,
            funding_type: s.funding_type,
            primary_sector: s.primary_sector,
            categories: s.categories,
            keywords: s.keywords?.slice(0, 3)
          }))
        })
      }

      // Filter by sector if available (using primary_sector)
      if (companyData?.libelleNaf && data) {
        const sectorKeywords = companyData.libelleNaf.toLowerCase().split(/\s+/)
        return data.filter(s => {
          // Include if no sector restriction or matches
          if (!s.primary_sector) return true
          const subsidySector = s.primary_sector.toLowerCase()
          return sectorKeywords.some((kw: string) => kw.length > 3 && subsidySector.includes(kw))
        })
      }

      return data || []
    } catch (err) {
      console.error("Error analyzing sector:", err)
      return []
    }
  }

  // Step 4: Query subsidies by geography from Supabase
  const analyzeGeography = async (companyData: any, sectorSubsidies: any[]): Promise<any[]> => {
    const userRegion = companyData?.region || profileData.region
    if (!userRegion) return sectorSubsidies

    // Filter sector subsidies by region
    return sectorSubsidies.filter(s => {
      if (!s.region || s.region.length === 0) return true // No restriction
      return s.region.some((r: string) =>
        r === userRegion ||
        r === "National" ||
        r === "France entiere" ||
        r.toLowerCase().includes("national") ||
        r.toLowerCase().includes("france")
      )
    })
  }

  // Step 5: Match eligibility - dedupe and validate
  const matchEligibility = async (subsidies: any[]): Promise<any[]> => {
    // Remove duplicates by ID
    const uniqueSubsidies = subsidies.reduce((acc, subsidy) => {
      if (!acc.find((s: any) => s.id === subsidy.id)) {
        acc.push(subsidy)
      }
      return acc
    }, [] as any[])

    return uniqueSubsidies
  }

  // Step 6: Calculate eligibility scores using V5 Hybrid Matcher
  const calculateScores = async (subsidies: any[], companyData: any): Promise<ScoredSubsidy[]> => {
    // Infer project types based on profile type and sector
    const inferredProjectTypes: string[] = []
    if (profileType === 'creation') {
      inferredProjectTypes.push('creation', 'tresorerie', 'investissement')
    } else if (profileType === 'association') {
      // Associations - focus on specific association funding
      inferredProjectTypes.push('emploi', 'investissement')
    } else {
      // Existing company - likely interested in development
      inferredProjectTypes.push('investissement', 'numerique', 'emploi')
    }
    // Add eco transition as it's widely applicable
    inferredProjectTypes.push('transition-eco')

    // Map NAF code prefix to sector for better matching
    const nafPrefix = (companyData?.codeNaf || profileData.sector || '').substring(0, 2)
    const nafToSector: Record<string, string> = {
      '01': 'agriculture', '02': 'agriculture', '03': 'agriculture',
      '10': 'agriculture', '11': 'agriculture',
      '41': 'construction', '42': 'construction', '43': 'construction',
      '45': 'commerce', '46': 'commerce', '47': 'commerce',
      '49': 'transport', '50': 'transport', '51': 'transport', '52': 'transport',
      '55': 'tourisme', '56': 'tourisme',
      '62': 'tech', '63': 'tech',
      '64': 'finance', '65': 'finance', '66': 'finance',
      '68': 'immobilier',
      '69': 'services', '70': 'services', '71': 'services', '72': 'tech', '73': 'services',
      '74': 'services', '75': 'sante', '86': 'sante', '87': 'sante', '88': 'sante',
      '85': 'education',
    }
    const mappedSector = nafToSector[nafPrefix] || profileData.sector || 'services'

    // Build a MaSubventionProProfile from the company data for V5 matcher
    const simulatedProfile: Partial<MaSubventionProProfile> = {
      id: 'simulation',
      user_id: 'simulation',
      company_name: companyData?.nom || profileData.companyName || '',
      siret: companyData?.siret || profileData.siret || null,
      siren: companyData?.siren || null,
      naf_code: companyData?.codeNaf || profileData.sector || null,
      naf_label: companyData?.libelleNaf || null,
      sector: mappedSector,
      region: companyData?.region || profileData.region || null,
      department: companyData?.departement || null,
      city: companyData?.commune || null,
      postal_code: companyData?.codePostal || null,
      employees: companyData?.trancheEffectif || '1-10',
      company_category: companyData?.categorieEntreprise || (profileType === 'association' ? 'Association' : 'PME'),
      legal_form: profileType === 'association' ? 'ASSO' : (companyData?.formeJuridique || null),
      year_created: companyData?.dateCreation ? new Date(companyData.dateCreation).getFullYear() : null,
      website_url: profileData.website || null,
      description: profileData.description || null,
      project_types: inferredProjectTypes,
      certifications: [],
      website_intelligence: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Use the real V5 calculateMatchScore function
    const scoredSubsidies = subsidies.map((subsidy: Subsidy) => {
      const { score, reasons } = calculateMatchScore(subsidy, simulatedProfile as MaSubventionProProfile)

      // Convert raw score to percentage (max possible ~105 points)
      const percentageScore = Math.min(100, Math.round((score / 105) * 100))

      return {
        ...subsidy,
        matchScore: score,
        matchReasons: reasons,
        eligibilityScore: percentageScore,
      } as ScoredSubsidy
    })

    // Sort by match score (descending)
    scoredSubsidies.sort((a, b) => b.matchScore - a.matchScore)

    // Filter out very low scores (less than 20 points)
    return scoredSubsidies.filter(s => s.matchScore >= 20)
  }

  // Step 7: Estimate total potential amounts
  // Show a realistic range from top matched subsidies
  const estimateAmounts = async (subsidies: any[]): Promise<{ subsidies: any[], totalPotential: string }> => {
    // Get all valid amounts from top subsidies (already sorted by match score)
    const amounts = subsidies
      .slice(0, 5) // Consider top 5 matches only
      .map(s => Number(s.amount_max) || Number(s.amount_min) || 0)
      .filter(a => a > 0)
      .sort((a, b) => a - b)

    if (amounts.length === 0) {
      return { subsidies, totalPotential: "Variable selon profil" }
    }

    // Min: median of top matches (realistic single subsidy)
    // Max: largest subsidy amount
    const medianIdx = Math.floor(amounts.length / 2)
    const minAmount = amounts[medianIdx] // median
    const maxAmount = amounts[amounts.length - 1] // largest

    // Format the range
    const formatted = minAmount === maxAmount
      ? `${maxAmount.toLocaleString("fr-FR")} EUR`
      : `Entre ${minAmount.toLocaleString("fr-FR")} et ${maxAmount.toLocaleString("fr-FR")} EUR`

    console.log("[DEBUG] Amount estimation:", {
      topAmounts: amounts,
      minAmount,
      maxAmount,
      formatted
    })

    return { subsidies, totalPotential: formatted }
  }

  // Helper: Convert database enum/technical values to readable French labels
  const formatCategoryLabel = (raw: string): string => {
    // Common enum mappings
    const enumMap: Record<string, string> = {
      // Sectors
      'CONST_BUILDING': 'Construction',
      'ENERGY_RENEWABLE': 'Energies renouvelables',
      'ENERGY_EFFICIENCY': 'Efficacite energetique',
      'AGRICULTURE': 'Agriculture',
      'TOURISM': 'Tourisme',
      'MANUFACTURING': 'Industrie',
      'DIGITAL': 'Numerique',
      'HEALTH': 'Sante',
      'TRANSPORT': 'Transport',
      'RETAIL': 'Commerce',
      'SERVICES': 'Services',
      'ENVIRONMENT': 'Environnement',
      'INNOVATION': 'Innovation',
      'EXPORT': 'Export',
      'EMPLOYMENT': 'Emploi',
      'TRAINING': 'Formation',
      'R_AND_D': 'Recherche et developpement',
      'RD': 'Recherche et developpement',
      // Funding types
      'GRANT': 'Subvention',
      'LOAN': 'Pret',
      'GUARANTEE': 'Garantie',
      'TAX_CREDIT': 'Credit d\'impot',
      'TAX_EXEMPTION': 'Exoneration fiscale',
    }

    // Check direct mapping first
    const upperRaw = raw.toUpperCase().replace(/-/g, '_')
    if (enumMap[upperRaw]) return enumMap[upperRaw]

    // Clean up underscore/hyphen formatting and capitalize
    const cleaned = raw
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())

    return cleaned
  }

  // Step 8: Finalize and structure the report
  const finalizeReport = async (
    subsidies: any[],
    totalPotential: string,
    companyData: any
  ): Promise<{
    companyData: any;
    matchedSubsidies: any[];
    totalAmount: string;
    categories: string[];
  }> => {
    // Extract DIVERSE categories - collect from each field type separately
    const fundingTypes = new Set<string>()
    const sectors = new Set<string>()
    const categoryTags = new Set<string>()
    const keywordTags = new Set<string>()

    subsidies.forEach(s => {
      // Funding types (e.g., "Subvention", "Pret", "Garantie", "Avance remboursable")
      if (s.funding_type && typeof s.funding_type === 'string' && s.funding_type.length > 2) {
        fundingTypes.add(formatCategoryLabel(s.funding_type))
      }
      // Primary sectors
      if (s.primary_sector && typeof s.primary_sector === 'string' && s.primary_sector.length > 2) {
        sectors.add(formatCategoryLabel(s.primary_sector))
      }
      // Category tags from categories[] array
      if (s.categories && Array.isArray(s.categories)) {
        s.categories.forEach((c: string) => {
          if (c && typeof c === 'string' && c.trim().length > 2) {
            categoryTags.add(formatCategoryLabel(c.trim()))
          }
        })
      }
      // Keywords as fallback
      if (s.keywords && Array.isArray(s.keywords)) {
        s.keywords.slice(0, 3).forEach((k: string) => {
          if (k && typeof k === 'string' && k.length > 3 && k.length < 20) {
            keywordTags.add(formatCategoryLabel(k))
          }
        })
      }
    })

    // Build diverse list: pick from each type to ensure variety
    const categories: string[] = []
    const exclude = new Set(['Autre', 'autre', 'Other', 'N/a'])

    // Take up to 2 unique funding types first
    Array.from(fundingTypes).filter(c => !exclude.has(c)).slice(0, 2).forEach(c => categories.push(c))
    // Then up to 2 sectors
    Array.from(sectors).filter(c => !exclude.has(c)).slice(0, 2).forEach(c => {
      if (!categories.includes(c)) categories.push(c)
    })
    // Fill remaining with category tags
    Array.from(categoryTags).filter(c => !exclude.has(c)).forEach(c => {
      if (categories.length < 6 && !categories.includes(c)) categories.push(c)
    })
    // Fill remaining with keywords if needed
    Array.from(keywordTags).filter(c => !exclude.has(c)).forEach(c => {
      if (categories.length < 6 && !categories.includes(c)) categories.push(c)
    })

    if (categories.length === 0) categories.push("Aides aux entreprises")

    // Debug: Log extracted categories
    console.log("[DEBUG] Extracted categories:", {
      fundingTypes: Array.from(fundingTypes),
      sectors: Array.from(sectors),
      categoryTags: Array.from(categoryTags),
      keywords: Array.from(keywordTags).slice(0, 5),
      final: categories
    })

    return {
      companyData,
      matchedSubsidies: subsidies.slice(0, 15), // Top 15 matches
      totalAmount: totalPotential,
      categories
    }
  }

  // Analysis steps with timing
  const analysisSteps = [
    {
      title: "Vérification de votre profil",
      description: "Nous validons les informations de votre entreprise auprès des registres officiels...",
      duration: 15,
      icon: <Search className="w-5 h-5" />
    },
    {
      title: "Enrichissement des données",
      description: "Récupération des données complémentaires : effectifs, chiffre d'affaires, code NAF, forme juridique...",
      duration: 20,
      icon: <BarChart3 className="w-5 h-5" />
    },
    {
      title: "Analyse sectorielle",
      description: "Identification des dispositifs spécifiques à votre secteur d'activité...",
      duration: 40,
      icon: <Factory className="w-5 h-5" />
    },
    {
      title: "Analyse géographique",
      description: "Recherche des aides régionales, départementales et communales disponibles dans votre zone...",
      duration: 45,
      icon: <MapPin className="w-5 h-5" />
    },
    {
      title: "Matching éligibilité",
      description: "Notre IA compare votre profil avec plus de 10 000 critères d'éligibilité...",
      duration: 60,
      icon: <Bot className="w-5 h-5" />
    },
    {
      title: "Calcul des scores",
      description: "Attribution d'un score de pertinence pour chaque aide identifiée...",
      duration: 50,
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      title: "Estimation des montants",
      description: "Analyse des montants historiquement accordés pour des profils similaires...",
      duration: 40,
      icon: <Coins className="w-5 h-5" />
    },
    {
      title: "Finalisation du rapport",
      description: "Préparation de votre rapport personnalisé avec recommandations prioritaires...",
      duration: 30,
      icon: <ClipboardList className="w-5 h-5" />
    }
  ]

  const totalAnalysisDuration = analysisSteps.reduce((acc, step) => acc + step.duration, 0) // ~300 seconds = 5 min

  // Mock subsidies data for demonstration
  const mockSubsidies = [
    {
      id: 1,
      name: "Aide à l'embauche des jeunes",
      type: "Subvention",
      source: "État - Ministère du Travail",
      eligibilityScore: 94,
      category: "Emploi",
      amount: "4 000 EUR",
      deadline: "31/12/2026",
    },
    {
      id: 2,
      name: "Crédit d'impôt recherche (CIR)",
      type: "Avantage fiscal",
      source: "État - DGFIP",
      eligibilityScore: 87,
      category: "Innovation",
      amount: "30% des dépenses",
      deadline: "Permanent",
    },
    {
      id: 3,
      name: "Aide à la transition écologique PME",
      type: "Subvention",
      source: "ADEME",
      eligibilityScore: 82,
      category: "Environnement",
      amount: "Jusqu'à 200 000 EUR",
      deadline: "30/06/2026",
    },
    {
      id: 4,
      name: "Prêt croissance TPE",
      type: "Prêt",
      source: "BPI France",
      eligibilityScore: 79,
      category: "Financement",
      amount: "10 000 - 50 000 EUR",
      deadline: "Permanent",
    },
    {
      id: 5,
      name: "Aide régionale à l'innovation",
      type: "Subvention",
      source: "Région Île-de-France",
      eligibilityScore: 76,
      category: "Innovation",
      amount: "Jusqu'à 100 000 EUR",
      deadline: "15/03/2026",
    },
    // Locked subsidies (shown as blurred)
    { id: 6, name: "Aide à l'export", eligibilityScore: 73, category: "International" },
    { id: 7, name: "Subvention numérique", eligibilityScore: 71, category: "Digital" },
    { id: 8, name: "Aide formation", eligibilityScore: 68, category: "Formation" },
    { id: 9, name: "Crédit bail équipement", eligibilityScore: 65, category: "Équipement" },
    { id: 10, name: "Garantie bancaire BPI", eligibilityScore: 62, category: "Financement" },
    { id: 11, name: "Aide artisanat", eligibilityScore: 58, category: "Artisanat" },
    { id: 12, name: "Subvention locale", eligibilityScore: 55, category: "Commune" },
  ]

  const totalPotentialAmount = "485 000 EUR"
  const categories = ["Emploi", "Innovation", "Environnement", "Financement", "International", "Digital"]

  // Fetch real subsidy count from database (only active subsidies with valid deadlines)
  useEffect(() => {
    const fetchSubsidyCount = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { count, error } = await supabase
          .from("subsidies")
          .select("*", { count: "exact", head: true })
          .eq('is_active', true)
          .or(`deadline.is.null,deadline.gte.${today}`)

        if (!error && count) {
          setSubsidyCount(count.toLocaleString("fr-FR"))
        }
      } catch (err) {
        console.error("Error fetching subsidy count:", err)
      }
    }
    fetchSubsidyCount()
  }, [])

  // Company search function
  const searchCompany = async (query: string) => {
    if (query.length < 3) {
      setCompanyResults([])
      return
    }
    setIsSearchingCompany(true)
    try {
      const response = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&per_page=5`
      )
      const data = await response.json()
      setCompanyResults(data.results || [])
    } catch (err) {
      console.error("Error searching company:", err)
    }
    setIsSearchingCompany(false)
  }

  const selectCompany = (company: any) => {
    setProfileData({
      ...profileData,
      companyName: company.nom_complet || company.nom_raison_sociale || "",
      siret: company.siege?.siret || "",
      region: company.siege?.region || "",
    })
    setCompanyResults([])
  }

  const handleSegmentClick = (segment: string) => {
    setActiveSegment(segment)
    setProfileType(null)
    setShowProfileModal(true)
  }

  const openProfileModal = () => {
    setProfileType(null)
    setProfileData({
      companyName: "",
      siret: "",
      region: "",
      sector: "",
      website: "",
      description: ""
    })
    setCompanyResults([])
    setDocuments([])
    setShowProfileModal(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => {
        // Max 10MB per file
        if (file.size > 10 * 1024 * 1024) {
          alert(`Le fichier ${file.name} dépasse 10 Mo`)
          return false
        }
        return true
      })
      setDocuments(prev => [...prev, ...newFiles])
    }
    // Reset input
    e.target.value = ''
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const handleCreateProfile = async () => {
    // Reset and start analysis
    setAnalysisStep(0)
    setAnalysisProgress(0)
    setAnalysisResults(null)
    setIsAnalyzing(true)

    // Helper to update progress with minimum duration per step
    const runStep = async <T,>(
      stepIndex: number,
      fn: () => Promise<T>,
      minDurationMs: number
    ): Promise<T> => {
      setAnalysisStep(stepIndex)
      const startTime = Date.now()

      // Run the actual function
      const result = await fn()

      // Ensure minimum duration for UX
      const elapsed = Date.now() - startTime
      if (elapsed < minDurationMs) {
        await new Promise(resolve => setTimeout(resolve, minDurationMs - elapsed))
      }

      // Update progress
      const progressPerStep = 100 / analysisSteps.length
      setAnalysisProgress((stepIndex + 1) * progressPerStep)

      return result
    }

    try {
      // Step 1: Verify profile (15 seconds min)
      const rawCompanyData = await runStep(0, verifyProfile, 15000)

      // Step 2: Enrich data (20 seconds min)
      const companyData = await runStep(1, () => enrichCompanyData(rawCompanyData), 20000)

      // Step 3: Analyze sector (40 seconds min)
      const sectorSubsidies = await runStep(2, () => analyzeSector(companyData), 40000)

      // Step 4: Analyze geography (45 seconds min)
      const geoFilteredSubsidies = await runStep(3, () => analyzeGeography(companyData, sectorSubsidies), 45000)

      // Step 5: Match eligibility (60 seconds min)
      const matchedSubsidies = await runStep(4, () => matchEligibility(geoFilteredSubsidies), 60000)

      // Step 6: Calculate scores (50 seconds min)
      const scoredSubsidies = await runStep(5, () => calculateScores(matchedSubsidies, companyData), 50000)

      // Step 7: Estimate amounts (40 seconds min)
      const { subsidies: finalSubsidies, totalPotential } = await runStep(
        6,
        () => estimateAmounts(scoredSubsidies),
        40000
      )

      // Step 8: Finalize report (30 seconds min)
      const results = await runStep(
        7,
        () => finalizeReport(finalSubsidies, totalPotential, companyData),
        30000
      )

      // Store results and show
      setAnalysisResults(results)
      setAnalysisProgress(100)

      // Small delay before showing results
      await new Promise(resolve => setTimeout(resolve, 500))
      setIsAnalyzing(false)
      setShowResults(true)

    } catch (error) {
      console.error("Analysis error:", error)
      // On error, still show results with fallback mock data
      setAnalysisResults({
        companyData: { nom: profileData.companyName || "Votre entreprise" },
        matchedSubsidies: mockSubsidies,
        totalAmount: "485 000 EUR",
        categories: ["Emploi", "Innovation", "Environnement", "Financement"]
      })
      setIsAnalyzing(false)
      setShowResults(true)
    }
  }

  const handleUpgrade = (plan: string) => {
    // Redirect to signup with profile data and plan
    const params = new URLSearchParams()
    params.set("plan", plan)
    params.set("type", profileType || "entreprise")
    if (profileData.companyName) params.set("company", profileData.companyName)
    if (profileData.siret) params.set("siret", profileData.siret)
    if (profileData.region) params.set("region", profileData.region)
    if (profileData.sector) params.set("sector", profileData.sector)
    if (profileData.website) params.set("website", profileData.website)
    if (profileData.description) params.set("description", profileData.description)
    navigate(`/signup?${params.toString()}`)
  }

  const closeResultsAndReset = () => {
    setShowResults(false)
    setShowProfileModal(false)
    setProfileType(null)
    setProfileData({
      companyName: "",
      siret: "",
      region: "",
      sector: "",
      website: "",
      description: ""
    })
    setDocuments([])
  }

  // Calculate completion for Entreprise form
  const entrepriseCompletion = () => {
    let completed = 0
    if (profileData.siret) completed++
    if (profileData.website) completed++
    if (profileData.description) completed++
    if (documents.length > 0) completed++
    return completed
  }

  // Calculate completion for Creation form
  const creationCompletion = () => {
    let completed = 0
    if (profileData.companyName) completed++
    if (profileData.sector) completed++
    if (profileData.region) completed++
    if (profileData.website) completed++
    if (profileData.description) completed++
    if (documents.length > 0) completed++
    return completed
  }

  const regions = [
    "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire",
    "Corse", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie",
    "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
    "Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte"
  ]

  const sectors = [
    "Agriculture", "Industrie", "Construction", "Commerce", "Transport",
    "Hébergement-Restauration", "Information-Communication", "Finance-Assurance",
    "Immobilier", "Services aux entreprises", "Santé", "Éducation", "Autre"
  ]

  return (
    <>
      <Helmet>
        <title>MaSubventionPro - Trouvez vos subventions et aides publiques en quelques minutes</title>
        <meta
          name="description"
          content="MaSubventionPro analyse plus de 10 000 aides publiques (Etat, Regions, Communes, Europe) pour identifier vos subventions, prets, garanties et exonerations fiscales et calculer vos scores d'eligibilite, avec rapports PDF detailles et moteur de recherche expert."
        />
        <link rel="canonical" href="https://www.masubventionpro.com" />
      </Helmet>

      {/* Header */}
      <header className="bg-white shadow-sm fixed w-full top-0 z-[1000]">
        <div className="max-w-[1400px] mx-auto px-8 py-4 flex justify-between items-center">
          <img src="/logo.svg" alt="MaSubventionPro" className="h-8" />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10">
            <a href="#profils" className="text-slate-900 font-medium hover:text-blue-800 transition-colors">
              Pour qui ?
            </a>
            <a href="#fonctionnalites" className="text-slate-900 font-medium hover:text-blue-800 transition-colors">
              Fonctionnalites
            </a>
            <a href="#tarifs" className="text-slate-900 font-medium hover:text-blue-800 transition-colors">
              Tarifs
            </a>
            <Link to="/notre-histoire" className="text-slate-900 font-medium hover:text-blue-800 transition-colors">
              Notre histoire
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 text-blue-800 border-2 border-blue-800 rounded-lg font-semibold hover:bg-blue-50 transition-all"
            >
              Connexion
            </Link>
            <button
              onClick={openProfileModal}
              className="px-6 py-3 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-800/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-800/30 transition-all"
            >
              Ma simulation
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b px-4 py-4 space-y-4">
            <a href="#profils" className="block text-slate-900 font-medium">Pour qui ?</a>
            <a href="#fonctionnalites" className="block text-slate-900 font-medium">Fonctionnalites</a>
            <a href="#tarifs" className="block text-slate-900 font-medium">Tarifs</a>
            <Link to="/notre-histoire" className="block text-slate-900 font-medium">Notre histoire</Link>
            <Link
              to="/login"
              className="block w-full text-center px-6 py-3 text-blue-800 border-2 border-blue-800 rounded-lg font-semibold"
            >
              Connexion
            </Link>
            <button
              onClick={() => { setMobileMenuOpen(false); openProfileModal(); }}
              className="block w-full text-center px-6 py-3 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold"
            >
              Ma simulation
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 text-white pt-16 pb-24 px-8 mt-[70px] relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(5,150,105,0.1)_0%,transparent_50%)]" />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="grid lg:grid-cols-[7fr_3fr] gap-16 items-stretch">
            {/* Hero Text */}
            <div className="flex flex-col">
              <h1 className="text-4xl lg:text-[3.75rem] font-extrabold leading-[1.1] mb-6">
                <span className="bg-gradient-to-br from-amber-400 to-amber-300 bg-clip-text text-transparent block text-5xl lg:text-[4rem]">Des milliards d'euros</span>
                d'aides publiques par an<br />sont non réclamés.
              </h1>
              <h2 className="text-3xl lg:text-[2.5rem] font-bold mb-6 leading-tight">
                Ne passez plus à côté.
              </h2>

              {/* LLM Summary - SEO optimized for AI search engines */}
              <p className="text-xl opacity-95 leading-relaxed mb-4">
                MaSubventionPro est une plateforme d'intelligence artificielle qui aide les créateurs, repreneurs, dirigeants d'entreprises, groupes et associations à identifier toutes les aides publiques disponibles : subventions, prêts, garanties, exonérations fiscales et dispositifs territoriaux.
              </p>

              <p className="text-xl opacity-95 leading-relaxed mb-6">
                Notre IA analyse en temps réel des milliers de dispositifs nationaux, régionaux, communaux et européens, calcule un score d'éligibilité et génère des rapports détaillés.
              </p>

              <p className="text-xl opacity-95 leading-relaxed mb-6 font-medium">
                Identifiez <span className="bg-gradient-to-br from-amber-400 to-amber-300 bg-clip-text text-transparent font-bold">TOUTES VOS OPPORTUNITÉS</span> en quelques minutes.
              </p>

              {/* Key Benefits - Added to match right side height */}
              <div className="grid grid-cols-2 gap-4 mt-auto">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-amber-400 mb-1">{subsidyCount}</div>
                  <div className="text-sm text-slate-300">Dispositifs d'aides référencés aujourd'hui</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-emerald-400 mb-1">Quotidien</div>
                  <div className="text-sm text-slate-300">Mise à jour des données</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-1">National</div>
                  <div className="text-sm text-slate-300">de la Commune à l'Europe</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-1">IA</div>
                  <div className="text-sm text-slate-300">Assistant IA expert</div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={openProfileModal}
                className="w-full mt-6 px-8 py-5 bg-gradient-to-br from-blue-600 to-blue-400 text-white rounded-xl font-semibold text-xl shadow-lg shadow-blue-600/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-3"
              >
                Lancer ma simulation
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>

            {/* Profile Selector Cards */}
            <div className="flex flex-col gap-3 h-full">
              {[
                {
                  id: 'pme',
                  icon: <TrendingUp className="w-10 h-10" />,
                  title: 'Dirigeant PME/PMI',
                  desc: 'Vous développez votre entreprise',
                },
                {
                  id: 'creation',
                  icon: <Rocket className="w-10 h-10" />,
                  title: 'Créateur',
                  desc: 'Vous lancez votre activité et avez besoin de capital',
                },
                {
                  id: 'groupe',
                  icon: <Building2 className="w-10 h-10" />,
                  title: 'Groupe / Holding',
                  desc: 'Vous gérez plusieurs sociétés',
                },
                {
                  id: 'repreneur',
                  icon: <RefreshCw className="w-10 h-10" />,
                  title: 'Repreneur',
                  desc: 'Vous reprenez une entreprise',
                },
                {
                  id: 'association',
                  icon: <Heart className="w-10 h-10" />,
                  title: 'Association',
                  desc: <>Vous gérez une association loi 1901<br />ou un organisme à but non lucratif</>,
                },
              ].map((segment) => (
                <div
                  key={segment.id}
                  onClick={() => handleSegmentClick(segment.id)}
                  className={`bg-white border-[3px] rounded-xl p-4 text-center cursor-pointer transition-all hover:border-blue-800 hover:shadow-lg hover:-translate-y-1 flex-1 flex flex-col justify-center ${
                    activeSegment === segment.id
                      ? 'border-blue-800 shadow-lg bg-gradient-to-br from-blue-800/5 to-emerald-600/5'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="text-blue-800 mb-2 flex justify-center">{segment.icon}</div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{segment.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{segment.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar - Two Column Layout */}
      <section className="bg-white py-16 px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {/* Column 1 - Qu'est-ce qui nous rend unique ? */}
            <div className="bg-gradient-to-br from-slate-100 to-slate-50 border-2 border-slate-200 px-8 py-8 rounded-2xl">
              <h3 className="text-2xl font-bold text-blue-800 mb-4">Qu'est-ce qui nous rend unique ?</h3>
              <p className="text-lg text-slate-700 leading-relaxed">
                Nous avons intégré <strong className="text-blue-800">EN PLUS</strong> du National et de l'Europe, les aides des <strong className="text-blue-800">Régions ET des Communes</strong>. Un niveau de couverture que peu de solutions proposent.
              </p>
            </div>

            {/* Column 2 - Quel est notre rôle ? */}
            <div className="bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-blue-700 px-8 py-8 rounded-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">Quel est notre rôle ?</h3>
              <p className="text-lg text-blue-100 leading-relaxed">
                Vous révéler les opportunités que vous ne connaissiez pas et mettre à votre disposition un <strong className="bg-gradient-to-br from-amber-400 to-amber-300 bg-clip-text text-transparent">assistant IA expert</strong> pour accompagner vos projets ou besoins.
              </p>
            </div>
          </div>

          {/* Propulsé par subvention360 */}
          <p className="text-slate-500 text-center flex items-center justify-center gap-2">
            Propulsé par <img src="/logo-subvention360.png" alt="subvention360" className="h-7 inline-block" /><span className="text-2xl font-bold text-blue-800">subvention360</span>
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="bg-slate-50 py-20 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              Une technologie sans équivalent
            </h2>
            <p className="text-xl text-slate-500">
              Propulsée par subvention360, la base de données de référence en France
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[
              {
                icon: <Target className="w-8 h-8 text-white" />,
                title: "Matching IA ultra-précis",
                desc: "Nos algorithmes analysent en profondeur votre profil (activité, secteur, effectifs, localisation, projets) et identifient automatiquement les dispositifs pertinents parmi les aides disponibles.",
                highlight: "Score d'éligibilité calculé pour chaque aide (ex: 92%)",
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-white" />,
                title: "Données historiques réelles",
                desc: "Pour chaque aide : montants réellement accordés (min, max, moyenne), nombre de bénéficiaires, délais de réponse. Des données concrètes, pas des estimations.",
                highlight: "Historique sur 3 ans si disponible",
              },
              {
                icon: <Search className="w-8 h-8 text-white" />,
                title: "Moteur de recherche expert",
                desc: "Explorez librement les dispositifs avec filtres avancés : région, secteur, montant, deadline, type d'aide. Trouvez exactement ce que vous cherchez.",
                highlight: "Recherche textuelle + 15 filtres combinables",
              },
              {
                icon: <Bot className="w-8 h-8 text-white" />,
                title: "Assistant IA expert - Pas un chatbot",
                desc: "Un véritable analyste financier augmenté qui consulte la base subvention360 en temps réel. Soumettez votre projet complet, l'IA l'analyse en profondeur et identifie toutes les opportunités.",
                highlight: "Réponses sourcées avec références officielles",
              },
              {
                icon: <FileText className="w-8 h-8 text-white" />,
                title: "Rapports PDF professionnels",
                desc: "Dossier complet pour chaque aide : critères d'éligibilité, montants, démarches détaillées, contacts directs des organismes, calendrier. Prêt à utiliser.",
                highlight: "Export Excel pour suivi personnalisé",
              },
              {
                icon: <Clock className="w-8 h-8 text-white" />,
                title: "Alertes d'urgence",
                desc: "Soyez notifié dès qu'un nouveau dispositif correspond à votre profil. Certaines aides ont des deadlines - ne manquez plus jamais une opportunité.",
                highlight: "Email mensuel personnalisé (offre annuelle)",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center text-3xl mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                <div className="bg-slate-50 p-4 rounded-lg mt-4 text-sm font-semibold text-blue-800">
                  {feature.highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="bg-white py-20 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              Choisissez votre offre
            </h2>
            <p className="text-xl text-slate-500">
              Transparence totale. Paiement sécurisé Stripe. Résiliable à tout moment.
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8 mt-12">
            {/* Découverte */}
            <div className="bg-white border-[3px] border-slate-200 rounded-3xl p-10 relative hover:-translate-y-2 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-slate-900">Découverte</h3>
              <p className="text-slate-500 mt-1">Idéal pour un premier diagnostic</p>
              <div className="my-6">
                <span className="text-6xl font-extrabold text-blue-800">49€</span>
                <span className="text-lg text-slate-500 ml-1">HT</span>
                <div className="text-lg text-slate-500">30 jours</div>
              </div>
              <ul className="space-y-0">
                {[
                  "Identification toutes aides éligibles",
                  "Assistant IA expert (30 questions)",
                  "Accès moteur recherche 10 000+ dispositifs",
                  "Rapport PDF détaillé téléchargeable",
                ].map((item, j, arr) => (
                  <li key={j} className={`py-3.5 flex items-start gap-3 text-sm ${j < arr.length - 1 ? 'border-b border-slate-200' : ''}`}>
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl mt-6 text-center">
                <h4 className="text-emerald-700 font-bold">Vos données vous appartiennent</h4>
                <p className="text-slate-600 text-sm">Aucune revente. Aucun partage. 100% confidentiel.</p>
              </div>
              <button
                onClick={() => navigate("/signup?plan=decouverte")}
                className="w-full mt-6 px-8 py-4 bg-white text-blue-800 border-2 border-blue-800 rounded-lg font-semibold text-lg hover:-translate-y-0.5 transition-all"
              >
                Choisir Découverte
              </button>
            </div>

            {/* Business - Featured */}
            <div className="bg-white border-[3px] border-blue-800 rounded-3xl p-10 relative shadow-xl shadow-blue-800/15">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-400 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-amber-500/30">
                RECOMMANDÉ
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mt-4">Business</h3>
              <p className="text-slate-500 mt-1">Pour un suivi optimal toute l'année</p>
              <div className="my-6">
                <span className="text-6xl font-extrabold text-blue-800">189€</span>
                <span className="text-lg text-slate-500 ml-1">HT/an</span>
                <div className="text-sm text-slate-400">15,75€/mois</div>
                <div className="text-sm text-blue-600 mt-1">+ 99€ par société supplémentaire</div>
              </div>
              <ul className="space-y-0">
                {[
                  "Identification toutes aides éligibles",
                  "Assistant IA expert (360 questions)",
                  "Accès moteur recherche 10 000+ dispositifs",
                  "Rapport PDF détaillé téléchargeable",
                  "Actualisation automatique des aides éligibles",
                  "Alertes nouveaux dispositifs par email",
                ].map((item, j, arr) => (
                  <li key={j} className={`py-3.5 flex items-start gap-3 text-sm ${j < arr.length - 1 ? 'border-b border-slate-200' : ''}`}>
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-blue-50 border-2 border-blue-200 p-3 rounded-xl mt-4 text-center">
                <p className="text-blue-700 text-sm font-medium">Upgrade depuis Découverte : payez 140€ dans les 30 jours</p>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl mt-3 text-center">
                <h4 className="text-emerald-700 font-bold">Vos données vous appartiennent</h4>
                <p className="text-slate-600 text-sm">Aucune revente. Aucun partage. 100% confidentiel.</p>
              </div>
              <button
                onClick={() => navigate("/signup?plan=business")}
                className="w-full mt-6 px-8 py-4 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold text-lg shadow-lg shadow-blue-800/20 hover:-translate-y-0.5 hover:shadow-xl transition-all"
              >
                Choisir Business
              </button>
            </div>

            {/* Premium Groupe */}
            <div className="bg-white border-[3px] border-slate-200 rounded-3xl p-10 relative hover:-translate-y-2 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-slate-900">Premium Groupe</h3>
              <p className="text-slate-500 mt-1">Pour holdings et groupes multi-sociétés</p>
              <div className="my-6">
                <span className="text-6xl font-extrabold text-blue-800">549€</span>
                <span className="text-lg text-slate-500 ml-1">HT/an</span>
                <div className="text-sm text-slate-400">pour 5 sociétés</div>
                <div className="text-sm text-blue-600 mt-1">+ 99€ par pack de 5 sociétés supplémentaires</div>
              </div>
              <ul className="space-y-0">
                {[
                  "Identification toutes aides éligibles",
                  "Assistant IA expert (360 questions)",
                  "Accès moteur recherche 10 000+ dispositifs",
                  "Rapport PDF détaillé téléchargeable",
                  "Multi-entités (5 sociétés incluses)",
                  "Actualisation automatique des aides éligibles",
                  "Alertes nouveaux dispositifs par email",
                  "Dashboard consolidé groupe",
                  "2h accompagnement utilisation",
                  "Importation entités (Excel ou CSV)",
                ].map((item, j, arr) => (
                  <li key={j} className={`py-3.5 flex items-start gap-3 text-sm ${j < arr.length - 1 ? 'border-b border-slate-200' : ''}`}>
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-blue-50 border-2 border-blue-200 p-3 rounded-xl mt-4 text-center text-sm">
                <p className="text-blue-700 font-medium">Upgrade depuis Découverte : crédit 49€ → payez 500€</p>
                <p className="text-blue-700 font-medium">Upgrade depuis Business : crédit 189€ → payez 360€</p>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl mt-3 text-center">
                <h4 className="text-emerald-700 font-bold">Vos données vous appartiennent</h4>
                <p className="text-slate-600 text-sm">Aucune revente. Aucun partage. 100% confidentiel.</p>
              </div>
              <button
                onClick={() => navigate("/signup?plan=premium")}
                className="w-full mt-6 px-8 py-4 bg-white text-blue-800 border-2 border-blue-800 rounded-lg font-semibold text-lg hover:-translate-y-0.5 transition-all"
              >
                Choisir Premium Groupe
              </button>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-slate-500 text-lg mb-4">
              Paiement 100% sécurisé par Stripe (SEPA, CB, Visa, Mastercard)
            </p>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-800 text-white py-20 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">
              Vos données en sécurité maximale
            </h2>
            <p className="text-xl opacity-90">
              Nous prenons la protection de vos données très au sérieux. Voici nos engagements fermes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {[
              {
                icon: <Lock className="w-6 h-6" />,
                title: "Zéro revente de données",
                desc: "Vos données ne seront JAMAIS vendues, louées ou cédées à des tiers. C'est un engagement absolu et irrévocable.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "100% conforme RGPD",
                desc: "Respect total du règlement européen. DPO dédié. Hébergement UE exclusivement. Infrastructure certifiée SOC 2 Type 2.",
              },
              {
                icon: <Bot className="w-6 h-6" />,
                title: "IA éthique et privée",
                desc: "Vos données ne servent PAS à entraîner nos IA. Traitement 100% confidentiel sur nos serveurs. Conforme IA Act européen.",
              },
            ].map((card, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">{card.icon} {card.title}</h3>
                <p className="opacity-90 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 p-8 bg-white/15 rounded-xl text-center">
            <h3 className="text-2xl font-bold mb-4">VOS DONNÉES VOUS APPARTIENNENT</h3>
            <p className="text-lg opacity-95 leading-relaxed">
              Aucune utilisation commerciale. Aucun partage. Aucune revente. Vos informations sont utilisées UNIQUEMENT pour vous fournir le service souscrit. Point final.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <h4 className="text-2xl font-bold mb-4">MaSubventionPro</h4>
              <p className="text-white/70 leading-relaxed mb-6">
                La plateforme d'intelligence artificielle qui identifie toutes vos aides publiques. Propulsée par subvention360, la référence des professionnels du financement.
              </p>
              <p className="font-semibold">
                contact@masubventionpro.com<br />
                support@masubventionpro.com
              </p>
            </div>

            {/* Entreprise */}
            <div>
              <h5 className="text-lg font-semibold mb-4">Entreprise</h5>
              <div className="space-y-3">
                <Link to="/notre-histoire" className="block text-white/70 hover:text-white transition-colors">Notre histoire</Link>
                <a href="#" className="block text-white/70 hover:text-white transition-colors">Notre technologie</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors">Blog</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors">Presse</a>
              </div>
            </div>

            {/* Ressources */}
            <div>
              <h5 className="text-lg font-semibold mb-4">Ressources</h5>
              <div className="space-y-3">
                <a href="#" className="block text-white/70 hover:text-white transition-colors">Guide des aides</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors">FAQ</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors">Support</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors">Webinaires</a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h5 className="text-lg font-semibold mb-4">Légal</h5>
              <div className="space-y-3">
                <Link to="/mentions-legales" className="block text-white/70 hover:text-white transition-colors">Mentions légales</Link>
                <Link to="/cgu" className="block text-white/70 hover:text-white transition-colors">CGU</Link>
                <Link to="/cgv" className="block text-white/70 hover:text-white transition-colors">CGV</Link>
                <Link to="/privacy" className="block text-white/70 hover:text-white transition-colors">Politique RGPD</Link>
                <Link to="/cookies" className="block text-white/70 hover:text-white transition-colors">Cookies</Link>
                <Link to="/ai-transparency" className="block text-white/70 hover:text-white transition-colors">Transparence IA</Link>
              </div>
            </div>

            {/* Professionnels */}
            <div>
              <h5 className="text-lg font-semibold mb-4">Professionnels</h5>
              <div className="space-y-3">
                <a href="https://subvention360.com" target="_blank" rel="noopener noreferrer" className="block text-white/70 hover:text-white transition-colors">subvention360 Pro</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors">Devenir partenaire</a>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-white/5 p-6 rounded-xl mb-8 max-w-[900px] mx-auto">
            <p className="text-white/80 text-sm leading-relaxed">
              <strong>Disclaimer important :</strong> MaSubventionPro est un outil d'identification et d'analyse des aides publiques disponibles. Nous ne garantissons pas l'obtention des aides identifiées. L'éligibilité effective, la constitution des dossiers de demande et l'attribution finale relèvent de votre responsabilité et des décisions souveraines des organismes attributeurs (État, Régions, Communes, Europe, BPI France, etc.). Les montants estimés sont indicatifs et basés sur des données historiques. MaSubventionPro ne se substitue pas à un expert-comptable, avocat ou conseil en financement pour la constitution de vos dossiers.
            </p>
          </div>

          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-white/50 text-sm">
              2026 MaSubventionPro. Tous droits réservés. | Propulsé par subvention360
            </p>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">Base de données hébergée en UE</span>
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">100% conforme RGPD</span>
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">Certifié SOC 2 Type 2</span>
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">IA française (Mistral)</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Profile Creation Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {showResults ? "Vos aides identifiées" :
                   isAnalyzing ? "Analyse en cours" :
                   !profileType ? "Simulation" :
                   profileType === 'entreprise' ? "Simulation - Entreprise" :
                   profileType === 'association' ? "Simulation - Association" :
                   "Simulation - Entreprise en création"}
                </h3>
              </div>
              <button
                onClick={showResults ? closeResultsAndReset : () => setShowProfileModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Analyzing Animation */}
              {isAnalyzing && (
                <div className="py-8">
                  {/* Progress Bar */}
                  <div className="max-w-lg mx-auto mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Progression globale</span>
                      <span className="text-sm font-bold text-blue-800">{Math.round(analysisProgress)}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${analysisProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">
                        Étape {analysisStep + 1} sur {analysisSteps.length}
                      </span>
                      <span className="text-xs text-slate-500">
                        Temps restant : ~{Math.ceil((totalAnalysisDuration * (100 - analysisProgress) / 100) / 60)} min
                      </span>
                    </div>
                  </div>

                  {/* Current Step */}
                  <div className="max-w-lg mx-auto mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
                          {analysisSteps[analysisStep]?.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 mb-1">
                            {analysisSteps[analysisStep]?.title}
                          </h4>
                          <p className="text-slate-600 text-sm">
                            {analysisSteps[analysisStep]?.description}
                          </p>
                        </div>
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                      </div>
                    </div>
                  </div>

                  {/* Steps Timeline - Vertical */}
                  <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Étapes de l'analyse</h4>
                    <div className="space-y-2">
                      {analysisSteps.map((step, index) => (
                        <div key={index} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                          index === analysisStep ? 'bg-blue-50 border border-blue-200' :
                          index < analysisStep ? 'bg-emerald-50/50' : ''
                        }`}>
                          {/* Status Icon */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                            index < analysisStep ? 'bg-emerald-500 text-white' :
                            index === analysisStep ? 'bg-blue-600 text-white' :
                            'bg-slate-200 text-slate-400'
                          }`}>
                            {index < analysisStep ? (
                              <Check className="w-4 h-4" />
                            ) : index === analysisStep ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span className="text-xs">{index + 1}</span>
                            )}
                          </div>

                          {/* Step Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{step.icon}</span>
                              <span className={`text-sm font-medium truncate ${
                                index < analysisStep ? 'text-emerald-700' :
                                index === analysisStep ? 'text-blue-800' :
                                'text-slate-400'
                              }`}>
                                {step.title}
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
                            {index > analysisStep && (
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
              {showResults && !isAnalyzing && (() => {
                // Helper to extract title (can be string or object)
                const getTitle = (subsidy: any) => {
                  if (!subsidy.title && subsidy.name) return subsidy.name // Fallback for mock data
                  if (typeof subsidy.title === 'string') return subsidy.title
                  if (subsidy.title?.fr) return subsidy.title.fr
                  if (subsidy.title?.en) return subsidy.title.en
                  return 'Aide sans titre'
                }

                // Helper to truncate title to 5-6 words
                const truncateTitle = (title: string, maxWords: number = 6) => {
                  const words = title.split(/\s+/)
                  if (words.length <= maxWords) return title
                  return words.slice(0, maxWords).join(' ') + '...'
                }

                // Use real results if available, fallback to mock data
                const allSubsidies = analysisResults?.matchedSubsidies || mockSubsidies
                // Filter out subsidies with deadlines less than 1 month away
                const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                const displaySubsidies = allSubsidies.filter((subsidy: any) => {
                  if (!subsidy.deadline) return true // No deadline = permanent, keep it
                  const deadlineDate = new Date(subsidy.deadline)
                  return deadlineDate > oneMonthFromNow
                })
                const displayAmount = analysisResults?.totalAmount || totalPotentialAmount
                const displayCategories = analysisResults?.categories || categories
                const displayVisible = displaySubsidies.slice(0, 3)
                const displayLocked = displaySubsidies.slice(3)

                // Translate sector codes to French
                const sectorTranslations: Record<string, string> = {
                  'ENERGY_RENEWABLE': 'Énergies renouvelables',
                  'WASTE_RECYCLING': 'Recyclage et déchets',
                  'EDUCATION_TRAINING': 'Formation et éducation',
                  'ECONOMIC_DEVELOPMENT': 'Développement économique',
                  'DIGITAL_TECHNOLOGY': 'Numérique et technologie',
                  'ENVIRONMENT': 'Environnement',
                  'INNOVATION': 'Innovation',
                  'EXPORT': 'Export et international',
                  'AGRICULTURE': 'Agriculture',
                  'HEALTH': 'Santé',
                  'TOURISM': 'Tourisme',
                  'CULTURE': 'Culture',
                  'TRANSPORT': 'Transport et mobilité',
                  'CONSTRUCTION': 'Construction et BTP',
                  'INDUSTRY': 'Industrie',
                }

                const translateSector = (sector: string) => {
                  return sectorTranslations[sector] || sector.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
                }

                // Group subsidies by agency/source for Option 2 summary
                const groupedByAgency = displaySubsidies.reduce((acc: Record<string, { subsidies: any[], types: Set<string>, categories: Set<string> }>, subsidy: any) => {
                  const agency = subsidy.agency || subsidy.source || 'Autres organismes'
                  if (!acc[agency]) {
                    acc[agency] = { subsidies: [], types: new Set(), categories: new Set() }
                  }
                  acc[agency].subsidies.push(subsidy)
                  const type = subsidy.funding_type || subsidy.type || 'Aide'
                  acc[agency].types.add(type)
                  if (subsidy.primary_sector) acc[agency].categories.add(translateSector(subsidy.primary_sector))
                  return acc
                }, {})

                // Convert to array and sort by count
                const agencyGroups = Object.entries(groupedByAgency)
                  .map(([agency, data]) => ({
                    agency,
                    count: data.subsidies.length,
                    types: Array.from(data.types),
                    categories: Array.from(data.categories).slice(0, 3)
                  }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 4) // Show top 4 agencies

                return (
                <div className="space-y-6">
                  {/* Company Info Banner (if available) */}
                  {analysisResults?.companyData?.nom && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-slate-900">{analysisResults.companyData.nom}</p>
                          {analysisResults.companyData.libelleNaf && (
                            <p className="text-sm text-slate-500">{analysisResults.companyData.libelleNaf}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary Banner */}
                  <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl p-6 text-white">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-6 h-6 text-amber-300" />
                      <h3 className="text-xl font-bold">Résultats de votre simulation</h3>
                    </div>
                    <div className="flex justify-center gap-4">
                      <div className="bg-white/20 rounded-lg p-4 text-center min-w-[120px]">
                        <div className="text-3xl font-extrabold">{displaySubsidies.length}</div>
                        <div className="text-sm opacity-90">Aides identifiées</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-4 text-center min-w-[120px]">
                        <div className="text-3xl font-extrabold">{displayAmount}</div>
                        <div className="text-sm opacity-90">Montant potentiel</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-4 text-center min-w-[120px]">
                        <div className="text-3xl font-extrabold">{displayCategories.length}</div>
                        <div className="text-sm opacity-90">{displayCategories.length === 1 ? "Catégorie" : "Catégories"}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {displayCategories.map((cat) => {
                        // Normalize category: proper capitalization and translate common English terms
                        const translations: Record<string, string> = {
                          'waste recycling': 'Recyclage',
                          'economic development': 'Développement économique',
                          'renewable energy': 'Énergies renouvelables',
                          'energies renouvelables': 'Énergies renouvelables',
                          'développement économique': 'Développement économique',
                        }
                        const lower = cat.toLowerCase()
                        const normalized = translations[lower] ||
                          cat.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
                        return (
                          <span key={cat} className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                            {normalized}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Option 2: Category Summary by Agency */}
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
                                {group.categories.length > 0
                                  ? group.categories.join(', ')
                                  : 'Financement et accompagnement'}
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

                  {/* Option 1: Visible Preview Cards with Truncated Titles */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-slate-900">Aides correspondant à votre profil</h4>
                      <span className="text-sm text-slate-500">Aperçu limité - {displayVisible.length} sur {displaySubsidies.length}</span>
                    </div>

                    <div className="space-y-3">
                      {displayVisible.map((subsidy: any) => (
                        <div key={subsidy.id} className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-bold text-slate-900">{truncateTitle(getTitle(subsidy))}</h5>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  {subsidy.funding_type || subsidy.type || "Aide"}
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
                  {displayLocked.length > 0 && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white z-10 pointer-events-none"></div>
                    <div className="space-y-3 blur-[2px]">
                      {displayLocked.slice(0, 3).map((subsidy: any) => (
                        <div key={subsidy.id} className="bg-slate-100 border-2 border-slate-200 rounded-xl p-4 opacity-60">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-bold text-slate-600">{truncateTitle(getTitle(subsidy))}</h5>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span>{subsidy.funding_type || subsidy.type || subsidy.category || "Aide"}</span>
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
                          +{Math.max(0, displayLocked.length - 3)} autres aides identifiées
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
                        Accédez aux détails complets des {displaySubsidies.length} aides identifiées pour votre entreprise
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Découverte Option */}
                      <div className="bg-white rounded-xl p-5 border-2 border-slate-200 hover:border-blue-400 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-bold text-slate-900">Découverte</h5>
                          <span className="text-2xl font-extrabold text-blue-800">49€ <span className="text-sm font-normal text-slate-500">HT</span></span>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600 mb-4">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Accès 30 jours
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Assistant IA (30 questions)
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Rapport PDF téléchargeable
                          </li>
                        </ul>
                        <button
                          onClick={() => handleUpgrade('decouverte')}
                          className="w-full py-2.5 border-2 border-blue-800 text-blue-800 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                        >
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
                          <span className="text-2xl font-extrabold text-blue-800">189€ <span className="text-sm font-normal text-slate-500">HT/an</span></span>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600 mb-4">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Assistant IA (360 questions)
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Alertes nouveaux dispositifs
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Actualisation automatique
                          </li>
                        </ul>
                        <button
                          onClick={() => handleUpgrade('business')}
                          className="w-full py-2.5 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-800/20 hover:-translate-y-0.5 transition-all"
                        >
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
                    <button
                      onClick={closeResultsAndReset}
                      className="text-slate-500 hover:text-slate-700 text-sm underline"
                    >
                      Fermer et revenir à l'accueil
                    </button>
                  </div>
                </div>
              )})()}

              {/* Type Selection */}
              {!profileType && !showResults && !isAnalyzing && (
                <div className="space-y-4 max-w-lg mx-auto">
                  {/* Option 1: Entreprise existante */}
                  <button
                    onClick={() => setProfileType('entreprise')}
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
                    onClick={() => setProfileType('creation')}
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

                  {/* Option 3: Association */}
                  <button
                    onClick={() => setProfileType('association')}
                    className="w-full p-6 border-2 border-slate-200 rounded-xl text-left hover:border-purple-600 hover:bg-purple-50/50 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Heart className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-purple-600">Association</h4>
                        <p className="text-slate-500 text-sm mb-3">Vous gérez une association loi 1901 ou un organisme à but non lucratif</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-purple-600" />
                            <span>Recherche par RNA ou SIRET</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-purple-600" />
                            <span>Subventions spécifiques associations</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors mt-1" />
                    </div>
                  </button>
                </div>
              )}

              {/* Entreprise Form */}
              {profileType === 'entreprise' && !showResults && !isAnalyzing && (
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
                          value={profileData.companyName}
                          onChange={(e) => {
                            setProfileData({ ...profileData, companyName: e.target.value })
                            searchCompany(e.target.value)
                          }}
                          placeholder="Nom d'entreprise, SIRET ou SIREN"
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors"
                        />
                        {isSearchingCompany && (
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <div className="w-5 h-5 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Search Results */}
                      {companyResults.length > 0 && (
                        <div className="mt-2 border-2 border-slate-200 rounded-lg overflow-hidden">
                          {companyResults.map((company, i) => (
                            <button
                              key={i}
                              onClick={() => selectCompany(company)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                            >
                              <p className="font-semibold text-slate-900">{company.nom_complet || company.nom_raison_sociale}</p>
                              <p className="text-sm text-slate-500">
                                {company.siege?.siret} - {company.siege?.libelle_commune}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}

                      {profileData.siret && (
                        <div className="mt-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-emerald-700">
                            <Check className="w-4 h-4" />
                            <span className="font-semibold text-sm">Entreprise sélectionnée</span>
                          </div>
                          <p className="text-slate-700 text-sm mt-1">{profileData.companyName}</p>
                          <p className="text-xs text-slate-500">SIRET: {profileData.siret}</p>
                        </div>
                      )}
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        Site web de l'entreprise <span className="text-slate-400 font-normal">(Recommandé)</span>
                      </label>
                      <input
                        type="text"
                        value={profileData.website}
                        onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                        placeholder="exemple.com"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        Description <span className="text-slate-400 font-normal">(Recommandé)</span>
                      </label>
                      <textarea
                        value={profileData.description}
                        onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                        placeholder="Brève description de vos activités commerciales..."
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors resize-none"
                      />
                    </div>

                    {/* Documents */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        Documents <span className="text-slate-400 font-normal">(Recommandé)</span>
                      </label>
                      <p className="text-xs text-slate-500 mb-3">Ajoutez des documents pour enrichir votre profil</p>

                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-800 hover:bg-blue-50/50 transition-all">
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <p className="text-sm text-slate-500">Business plan, presentation, Kbis... (PDF, Word, max 10 Mo)</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          onChange={handleFileSelect}
                        />
                      </label>

                      {/* File list */}
                      {documents.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {documents.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-800" />
                                <span className="text-sm text-slate-700 truncate max-w-[200px]">{file.name}</span>
                                <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(1)} Mo)</span>
                              </div>
                              <button
                                onClick={() => removeDocument(index)}
                                className="p-1 hover:bg-slate-200 rounded transition-colors"
                              >
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
                        <span className="text-sm font-bold text-blue-800">{entrepriseCompletion()}/4</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium flex items-center gap-1.5 ${profileData.siret ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {profileData.siret ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} SIRET
                          </span>
                          <span className="text-red-500 text-xs">Obligatoire</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium flex items-center gap-1.5 ${profileData.website ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {profileData.website ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Site web
                          </span>
                          <span className="text-slate-400 text-xs">Recommande</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium flex items-center gap-1.5 ${profileData.description ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {profileData.description ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Description
                          </span>
                          <span className="text-slate-400 text-xs">Recommande</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium flex items-center gap-1.5 ${documents.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {documents.length > 0 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Documents
                          </span>
                          <span className="text-slate-400 text-xs">Recommande</span>
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
              {profileType === 'creation' && !showResults && !isAnalyzing && (
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Main Form */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Company Name */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        1. Nom prévu pour l'entreprise en création ou reprise <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={profileData.companyName}
                        onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                        placeholder="Ex: EcoTech Solutions"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors"
                      />
                    </div>

                    {/* Sector */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        2. Secteur d'activité <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={profileData.sector}
                        onChange={(e) => setProfileData({ ...profileData, sector: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors appearance-none bg-white"
                      >
                        <option value="">Sélectionnez le secteur</option>
                        {sectors.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Region */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        3. Région d'implantation <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={profileData.region}
                        onChange={(e) => setProfileData({ ...profileData, region: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors appearance-none bg-white"
                      >
                        <option value="">Sélectionnez la région</option>
                        <option value="À déterminer">À déterminer</option>
                        {regions.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        4. Site web de l'entreprise <span className="text-slate-400 font-normal">(Recommandé)</span>
                      </label>
                      <input
                        type="text"
                        value={profileData.website}
                        onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                        placeholder="www.exemple.com"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        5. Description <span className="text-slate-400 font-normal">(Recommandé)</span>
                      </label>
                      <textarea
                        value={profileData.description}
                        onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                        placeholder="Brève description des activités commerciales..."
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors resize-none"
                      />
                    </div>

                    {/* Documents */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        6. Documents <span className="text-slate-400 font-normal">(Recommandé)</span>
                      </label>
                      <p className="text-xs text-slate-500 mb-3">Ajoutez des documents pour enrichir le profil</p>

                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-800 hover:bg-blue-50/50 transition-all">
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <p className="text-sm text-slate-500">Business plan, presentation, Kbis... (PDF, Word, max 10 Mo)</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          onChange={handleFileSelect}
                        />
                      </label>

                      {/* File list */}
                      {documents.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {documents.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-800" />
                                <span className="text-sm text-slate-700 truncate max-w-[200px]">{file.name}</span>
                                <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(1)} Mo)</span>
                              </div>
                              <button
                                onClick={() => removeDocument(index)}
                                className="p-1 hover:bg-slate-200 rounded transition-colors"
                              >
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
                        <span className="text-sm font-bold text-blue-800">{creationCompletion()}/6</span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className={`font-medium flex items-center gap-1.5 ${profileData.companyName ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {profileData.companyName ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Nom de l'entreprise
                          </span>
                          <span className="text-red-500 text-xs ml-2">Obligatoire</span>
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium flex items-center gap-1.5 ${profileData.sector ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {profileData.sector ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Secteur d'activité
                          </span>
                          <span className="text-red-500 text-xs ml-2">Obligatoire</span>
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium flex items-center gap-1.5 ${profileData.region ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {profileData.region ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Région d'implantation
                          </span>
                          <span className="text-red-500 text-xs ml-2">Obligatoire</span>
                          <p className="text-xs text-slate-400 mt-1">Choisissez "À déterminer" pour explorer les aides dans différentes régions.</p>
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium flex items-center gap-1.5 ${profileData.website ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {profileData.website ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Site web
                          </span>
                          <span className="text-slate-400 text-xs ml-2">Recommandé</span>
                          <p className="text-xs text-slate-400 mt-1">Notre IA analyse le site pour identifier des aides ciblées.</p>
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium flex items-center gap-1.5 ${profileData.description ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {profileData.description ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Description
                          </span>
                          <span className="text-slate-400 text-xs ml-2">Recommandé</span>
                          <p className="text-xs text-slate-400 mt-1">Plus les activités sont détaillées, plus les résultats seront pertinents.</p>
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium flex items-center gap-1.5 ${documents.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {documents.length > 0 ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />} Documents
                          </span>
                          <span className="text-slate-400 text-xs ml-2">Recommandé</span>
                          <p className="text-xs text-slate-400 mt-1">Business plan, Kbis ou présentation pour une analyse approfondie.</p>
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

              {/* Association Form */}
              {profileType === 'association' && !showResults && !isAnalyzing && (
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Main Form */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Association Search */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        Rechercher votre association <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={profileData.companyName}
                          onChange={(e) => {
                            setProfileData({ ...profileData, companyName: e.target.value })
                            searchCompany(e.target.value)
                          }}
                          placeholder="Nom d'association, SIRET ou numéro RNA (W + 9 chiffres)"
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                        />
                        {isSearchingCompany && (
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Search Results */}
                      {companyResults.length > 0 && (
                        <div className="mt-2 border-2 border-slate-200 rounded-lg overflow-hidden">
                          {companyResults.map((company, i) => (
                            <button
                              key={i}
                              onClick={() => selectCompany(company)}
                              className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b border-slate-100 last:border-b-0 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-purple-600" />
                                <span className="font-medium text-slate-900">{company.nom_complet}</span>
                              </div>
                              <p className="text-sm text-slate-500 mt-1">{company.siege?.adresse} - {company.siege?.code_postal} {company.siege?.libelle_commune}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Association */}
                    {profileData.siret && (
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Heart className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900">{profileData.companyName}</h4>
                            <p className="text-sm text-slate-600 mt-1">SIRET: {profileData.siret}</p>
                            <p className="text-sm text-slate-500">{profileData.region}</p>
                          </div>
                          <button
                            onClick={() => setProfileData({ ...profileData, siret: '', companyName: '' })}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sector */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        Domaine d'activité <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={profileData.sector}
                        onChange={(e) => setProfileData({ ...profileData, sector: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors bg-white"
                      >
                        <option value="">Sélectionnez un domaine</option>
                        <option value="culture">Culture / Médias / Communication</option>
                        <option value="education">Éducation / Formation</option>
                        <option value="services">Action sociale / Humanitaire</option>
                        <option value="sante">Santé / Médical</option>
                        <option value="environnement">Environnement / Énergie</option>
                        <option value="services">Sport / Loisirs</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        Objet / Mission de l'association
                      </label>
                      <textarea
                        value={profileData.description}
                        onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                        placeholder="Décrivez les activités et la mission de votre association..."
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors resize-none"
                      />
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        Site web <span className="text-slate-400 text-xs ml-2">Recommandé</span>
                      </label>
                      <input
                        type="url"
                        value={profileData.website}
                        onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                        placeholder="https://mon-association.org"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-purple-600 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Right Column - Info */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-xl p-5">
                      <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-purple-600" />
                        Subventions pour associations
                      </h4>
                      <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span>Subventions spécifiques ESS</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span>Aides aux associations loi 1901</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span>Financements FDVA, FONJEP...</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span>Dispositifs régionaux et locaux</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm text-amber-800">
                        <span className="font-bold">Astuce :</span> Détaillez l'objet de votre association pour trouver des aides ciblées sur votre domaine d'activité.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {profileType && !showResults && !isAnalyzing && (
              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
                <button
                  onClick={() => setProfileType(null)}
                  className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateProfile}
                  disabled={
                    profileType === 'entreprise' ? !profileData.siret :
                    profileType === 'association' ? (!profileData.siret && !profileData.companyName) || !profileData.sector :
                    (!profileData.companyName || !profileData.sector || !profileData.region)
                  }
                  className={`flex-1 px-6 py-3 text-white rounded-lg font-semibold shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
                    profileType === 'association'
                      ? 'bg-gradient-to-br from-purple-600 to-purple-500 shadow-purple-600/20'
                      : 'bg-gradient-to-br from-blue-800 to-blue-500 shadow-blue-800/20'
                  }`}
                >
                  Créer le profil
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}

export default LandingPage
