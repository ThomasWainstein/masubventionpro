import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { supabase } from "@/lib/supabase"
import { Menu, X, Building2, ArrowRight, Check, Upload, FileText, Trash2, Lock, Star, TrendingUp } from "lucide-react"
import { calculateMatchScore, ScoredSubsidy } from "@/hooks/useRecommendedSubsidies"
import { MaSubventionProProfile, Subsidy } from "@/types"

/**
 * MaSubventionPro Landing Page v8
 * CTA button + Profile creation modal (subvention360 style)
 */
const LandingPage = () => {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [subsidyCount, setSubsidyCount] = useState<string>("10 000+")
  const [activeSegment, setActiveSegment] = useState<string | null>(null)

  // Profile creation modal state
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileType, setProfileType] = useState<'entreprise' | 'creation' | null>(null)
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
    // Build a MaSubventionProProfile from the company data for V5 matcher
    const simulatedProfile: Partial<MaSubventionProProfile> = {
      id: 'simulation',
      user_id: 'simulation',
      company_name: companyData?.nom || profileData.companyName || '',
      siret: companyData?.siret || profileData.siret || null,
      siren: companyData?.siren || null,
      naf_code: companyData?.codeNaf || profileData.sector || null,
      naf_label: companyData?.libelleNaf || null,
      sector: profileData.sector || companyData?.codeNaf?.substring(0, 2) || null,
      region: companyData?.region || profileData.region || null,
      department: companyData?.departement || null,
      city: companyData?.commune || null,
      postal_code: companyData?.codePostal || null,
      employees: companyData?.trancheEffectif || null,
      company_category: companyData?.categorieEntreprise || null,
      legal_form: companyData?.formeJuridique || null,
      year_created: companyData?.dateCreation ? new Date(companyData.dateCreation).getFullYear() : null,
      website_url: profileData.website || null,
      description: profileData.description || null,
      project_types: [], // Could be enhanced with form selection
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
      title: "Verification de votre profil",
      description: "Nous validons les informations de votre entreprise aupres des registres officiels...",
      duration: 15,
      icon: "🔍"
    },
    {
      title: "Enrichissement des donnees",
      description: "Recuperation des donnees complementaires : effectifs, chiffre d'affaires, code NAF, forme juridique...",
      duration: 20,
      icon: "📊"
    },
    {
      title: "Analyse sectorielle",
      description: "Identification des dispositifs specifiques a votre secteur d'activite...",
      duration: 40,
      icon: "🏭"
    },
    {
      title: "Analyse geographique",
      description: "Recherche des aides regionales, departementales et communales disponibles dans votre zone...",
      duration: 45,
      icon: "📍"
    },
    {
      title: "Matching eligibilite",
      description: "Notre IA compare votre profil avec plus de 10 000 criteres d'eligibilite...",
      duration: 60,
      icon: "🤖"
    },
    {
      title: "Calcul des scores",
      description: "Attribution d'un score de pertinence pour chaque aide identifiee...",
      duration: 50,
      icon: "📈"
    },
    {
      title: "Estimation des montants",
      description: "Analyse des montants historiquement accordes pour des profils similaires...",
      duration: 40,
      icon: "💰"
    },
    {
      title: "Finalisation du rapport",
      description: "Preparation de votre rapport personnalise avec recommandations prioritaires...",
      duration: 30,
      icon: "📋"
    }
  ]

  const totalAnalysisDuration = analysisSteps.reduce((acc, step) => acc + step.duration, 0) // ~300 seconds = 5 min

  // Mock subsidies data for demonstration
  const mockSubsidies = [
    {
      id: 1,
      name: "Aide a l'embauche des jeunes",
      type: "Subvention",
      source: "Etat - Ministere du Travail",
      eligibilityScore: 94,
      category: "Emploi",
      amount: "4 000 EUR",
      deadline: "31/12/2026",
    },
    {
      id: 2,
      name: "Credit d'impot recherche (CIR)",
      type: "Avantage fiscal",
      source: "Etat - DGFIP",
      eligibilityScore: 87,
      category: "Innovation",
      amount: "30% des depenses",
      deadline: "Permanent",
    },
    {
      id: 3,
      name: "Aide a la transition ecologique PME",
      type: "Subvention",
      source: "ADEME",
      eligibilityScore: 82,
      category: "Environnement",
      amount: "Jusqu'a 200 000 EUR",
      deadline: "30/06/2026",
    },
    {
      id: 4,
      name: "Pret croissance TPE",
      type: "Pret",
      source: "BPI France",
      eligibilityScore: 79,
      category: "Financement",
      amount: "10 000 - 50 000 EUR",
      deadline: "Permanent",
    },
    {
      id: 5,
      name: "Aide regionale a l'innovation",
      type: "Subvention",
      source: "Region Ile-de-France",
      eligibilityScore: 76,
      category: "Innovation",
      amount: "Jusqu'a 100 000 EUR",
      deadline: "15/03/2026",
    },
    // Locked subsidies (shown as blurred)
    { id: 6, name: "Aide a l'export", eligibilityScore: 73, category: "International" },
    { id: 7, name: "Subvention numerique", eligibilityScore: 71, category: "Digital" },
    { id: 8, name: "Aide formation", eligibilityScore: 68, category: "Formation" },
    { id: 9, name: "Credit bail equipement", eligibilityScore: 65, category: "Equipement" },
    { id: 10, name: "Garantie bancaire BPI", eligibilityScore: 62, category: "Financement" },
    { id: 11, name: "Aide artisanat", eligibilityScore: 58, category: "Artisanat" },
    { id: 12, name: "Subvention locale", eligibilityScore: 55, category: "Commune" },
  ]

  const totalPotentialAmount = "485 000 EUR"
  const categories = ["Emploi", "Innovation", "Environnement", "Financement", "International", "Digital"]

  // Fetch real subsidy count from database
  useEffect(() => {
    const fetchSubsidyCount = async () => {
      try {
        const { count, error } = await supabase
          .from("subsidies")
          .select("*", { count: "exact", head: true })

        if (!error && count) {
          // Round to nearest thousand
          const roundedCount = Math.round(count / 1000) * 1000
          setSubsidyCount(roundedCount.toLocaleString("fr-FR"))
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
          alert(`Le fichier ${file.name} depasse 10 Mo`)
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
    "Auvergne-Rhone-Alpes", "Bourgogne-Franche-Comte", "Bretagne", "Centre-Val de Loire",
    "Corse", "Grand Est", "Hauts-de-France", "Ile-de-France", "Normandie",
    "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Cote d'Azur",
    "Guadeloupe", "Martinique", "Guyane", "La Reunion", "Mayotte"
  ]

  const sectors = [
    "Agriculture", "Industrie", "Construction", "Commerce", "Transport",
    "Hebergement-Restauration", "Information-Communication", "Finance-Assurance",
    "Immobilier", "Services aux entreprises", "Sante", "Education", "Autre"
  ]

  return (
    <>
      <Helmet>
        <title>MaSubventionPro - Ne laissez plus des milliards d'euros d'aides sur la table</title>
        <meta
          name="description"
          content="Des milliards d'euros d'aides publiques par an sont non reclamees. Notre IA analyse plus de 10 000 dispositifs pour identifier toutes vos opportunites."
        />
        <link rel="canonical" href="https://masubventionpro.com" />
      </Helmet>

      {/* Header */}
      <header className="bg-white shadow-sm fixed w-full top-0 z-[1000]">
        <div className="max-w-[1400px] mx-auto px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent">
            MaSubventionPro
          </div>

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
            <Link
              to="/login"
              className="px-6 py-3 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-800/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-800/30 transition-all"
            >
              Connexion
            </Link>
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
            <Link
              to="/login"
              className="block w-full text-center px-6 py-3 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold"
            >
              Connexion
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 text-white pt-32 pb-24 px-8 mt-[70px] relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(5,150,105,0.1)_0%,transparent_50%)]" />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-stretch">
            {/* Hero Text */}
            <div>
              <h1 className="text-4xl lg:text-[3.75rem] font-extrabold leading-[1.1] mb-6">
                <span className="bg-gradient-to-br from-amber-400 to-amber-300 bg-clip-text text-transparent block text-5xl lg:text-[4rem]">Des milliards d'euros</span>
                d'aides publiques par an sont non reclamees.
              </h1>
              <h2 className="text-3xl lg:text-[2.5rem] font-bold mb-6 leading-tight">
                Ne passez plus a cote.
              </h2>
              <p className="text-xl opacity-95 leading-relaxed mb-6 font-medium">
                Identifiez <strong>TOUTES VOS OPPORTUNITES</strong> en quelques minutes. Notre IA analyse plus de 10 000 dispositifs en temps reel pour vous reveler les aides publiques auxquelles votre entreprise pourrait etre eligible.
              </p>

              {/* Unique Value Proposition Box */}
              <div className="bg-amber-500/15 border-2 border-amber-500/40 px-6 py-5 rounded-xl mb-6">
                <h4 className="text-lg font-bold text-amber-400 mb-3">Pourquoi nous sommes uniques ?</h4>
                <p className="text-base opacity-95 leading-relaxed font-medium">
                  Nous avons integre <strong>EN PLUS</strong> du National et de l'Europe, les aides des <strong>Regions ET des Communes</strong>. Un niveau de couverture que peu d'autres solutions proposent.
                </p>
              </div>

              {/* Data Promise Box */}
              <div className="bg-emerald-500/15 border-2 border-emerald-500/30 px-6 py-5 rounded-xl mb-6">
                <h4 className="text-lg font-bold text-emerald-400 mb-2">VOS DONNEES VOUS APPARTIENNENT</h4>
                <p className="text-base opacity-95 leading-relaxed">
                  Aucune utilisation commerciale. Aucun partage. Aucune revente. Vos informations sont utilisees UNIQUEMENT pour vous fournir le service souscrit. Point final.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <span className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-full text-sm font-semibold border border-white/20">
                  {subsidyCount} dispositifs
                </span>
                <span className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-full text-sm font-semibold border border-white/20">
                  Actualise quotidiennement
                </span>
                <span className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-full text-sm font-semibold border border-white/20">
                  Commune - Europe
                </span>
                <span className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-full text-sm font-semibold border border-white/20">
                  Assistant IA personnalise
                </span>
              </div>
            </div>

            {/* CTA Card */}
            <div className="bg-white rounded-2xl p-12 shadow-2xl border border-white/30 flex flex-col justify-between">
              <div className="text-center mb-8">
                <span className="inline-block bg-emerald-600 text-white px-5 py-2 rounded-full text-base font-bold mb-6">
                  COMMENCEZ MAINTENANT
                </span>
                <h3 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-5">
                  Identifiez vos aides en quelques minutes
                </h3>
                <p className="text-slate-600 text-2xl leading-relaxed">
                  Creez votre profil entreprise et notre IA analysera instantanement plus de {subsidyCount} dispositifs d'aides publiques pour vous reveler toutes les opportunites auxquelles vous pourriez etre eligible : subventions, prets, garanties, exonerations fiscales et bien plus encore.
                </p>
              </div>

              {/* Key benefits */}
              <div className="space-y-5 mb-10 flex-grow flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-slate-700 text-xl font-medium">Analyse de {subsidyCount} dispositifs d'aides</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-slate-700 text-xl font-medium">Enrichissement automatique par SIRET</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-slate-700 text-xl font-medium">Scores d'eligibilite personnalises</span>
                </div>
              </div>

              <div>
                <button
                  onClick={openProfileModal}
                  className="w-full px-8 py-5 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-xl font-semibold text-xl shadow-lg shadow-blue-800/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-800/30 transition-all flex items-center justify-center gap-3"
                >
                  Lancer ma simulation
                  <ArrowRight className="w-6 h-6" />
                </button>

                <p className="text-center text-slate-400 text-sm mt-5">
                  Vos donnees restent 100% confidentielles
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="bg-slate-50 py-12 px-8 text-center">
        <div className="max-w-[1400px] mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            Une technologie eprouvee, des resultats concrets
          </h3>
          <p className="text-slate-500 text-lg mb-8">Propulse par subvention360, la base de donnees de reference</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-xl shadow-sm">
              <span className="text-5xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                {subsidyCount}
              </span>
              <p className="text-slate-500 font-semibold">Dispositifs d'aides dans notre base</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm">
              <span className="text-5xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                20+
              </span>
              <p className="text-slate-500 font-semibold">Sources officielles analysees</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm">
              <span className="text-5xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                Quotidien
              </span>
              <p className="text-slate-500 font-semibold">Frequence de mise a jour des donnees</p>
            </div>
          </div>
        </div>
      </section>

      {/* Segment Selector Section */}
      <section id="profils" className="bg-white py-16 px-8 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <div className="max-w-[1400px] mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
            Identifiez-vous en un coup d'oeil
          </h2>
          <p className="text-xl text-slate-500 mb-12">
            Chaque profil a ses opportunites specifiques. Laquelle est la votre ?
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                id: 'creation',
                icon: '🚀',
                title: 'Createur',
                desc: 'Vous lancez votre activite et avez besoin de capital de depart',
                benefit: 'Identifiez votre capital de depart et les aides au financement de stock',
              },
              {
                id: 'repreneur',
                icon: '🔄',
                title: 'Repreneur',
                desc: 'Vous reprenez une entreprise existante',
                benefit: 'Decouvrez les aides transmission et garanties bancaires disponibles',
              },
              {
                id: 'pme',
                icon: '📈',
                title: 'Dirigeant PME/PMI',
                desc: 'Vous developpez votre entreprise etablie',
                benefit: 'Identifiez les aides transition ecologique, recrutement et developpement',
              },
              {
                id: 'groupe',
                icon: '🏢',
                title: 'Groupe / Holding',
                desc: 'Vous gerez plusieurs societes',
                benefit: 'Decouvrez les opportunites d\'aides pour toutes vos filiales',
              },
            ].map((segment) => (
              <div
                key={segment.id}
                onClick={() => handleSegmentClick(segment.id)}
                className={`bg-white border-[3px] rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-blue-800 hover:shadow-lg hover:-translate-y-1 ${
                  activeSegment === segment.id
                    ? 'border-blue-800 shadow-lg bg-gradient-to-br from-blue-800/5 to-emerald-600/5'
                    : 'border-slate-200'
                }`}
              >
                <div className="text-5xl mb-4">{segment.icon}</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{segment.title}</h3>
                <p className="text-slate-500 leading-relaxed mb-4">{segment.desc}</p>
                <div className="bg-slate-50 p-4 rounded-lg text-sm font-semibold text-blue-800">
                  "{segment.benefit}"
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-white py-12 px-8 text-center">
        <div className="max-w-[1400px] mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            La base de donnees la plus complete du marche
          </h3>
          <p className="text-slate-500 text-lg mb-2">
            Notre role : vous reveler les opportunites que vous ne connaissiez pas.
          </p>
          <div className="flex items-center justify-center gap-3 text-slate-500 mb-8">
            <span>Propulse par</span>
            <span className="text-2xl font-bold text-blue-800">subvention360</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 bg-slate-50 rounded-xl">
              <span className="text-4xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                {subsidyCount}
              </span>
              <p className="text-slate-500 font-semibold text-sm">Dispositifs d'aides references</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl">
              <span className="text-4xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                20+
              </span>
              <p className="text-slate-500 font-semibold text-sm">Sources officielles scannees</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl">
              <span className="text-4xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                Quotidien
              </span>
              <p className="text-slate-500 font-semibold text-sm">Mise a jour des donnees</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl">
              <span className="text-4xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                National
              </span>
              <p className="text-slate-500 font-semibold text-sm">Commune - Europe</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="bg-slate-50 py-20 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              Une technologie sans equivalent
            </h2>
            <p className="text-xl text-slate-500">
              Propulsee par subvention360, la base de donnees de reference en France
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[
              {
                icon: "🎯",
                title: "Matching IA ultra-precis",
                desc: "Nos algorithmes analysent en profondeur votre profil (activite, secteur, effectifs, localisation, projets) et identifient automatiquement les dispositifs pertinents parmi les aides disponibles.",
                highlight: "Score d'eligibilite calcule pour chaque aide (ex: 92%)",
              },
              {
                icon: "📊",
                title: "Donnees historiques reelles",
                desc: "Pour chaque aide : montants reellement accordes (min, max, moyenne), nombre de beneficiaires, delais de reponse. Des donnees concretes, pas des estimations.",
                highlight: "Historique sur 3 ans si disponible",
              },
              {
                icon: "🔍",
                title: "Moteur de recherche expert",
                desc: "Explorez librement les dispositifs avec filtres avances : region, secteur, montant, deadline, type d'aide. Trouvez exactement ce que vous cherchez.",
                highlight: "Recherche textuelle + 15 filtres combinables",
              },
              {
                icon: "🤖",
                title: "Assistant IA expert - Pas un chatbot",
                desc: "Un veritable analyste financier augmente qui consulte la base subvention360 en temps reel. Soumettez votre projet complet, l'IA l'analyse en profondeur et identifie toutes les opportunites.",
                highlight: "Reponses sourcees avec references officielles",
              },
              {
                icon: "📄",
                title: "Rapports PDF professionnels",
                desc: "Dossier complet pour chaque aide : criteres d'eligibilite, montants, demarches detaillees, contacts directs des organismes, calendrier. Pret a utiliser.",
                highlight: "Export Excel pour suivi personnalise",
              },
              {
                icon: "⏰",
                title: "Alertes d'urgence",
                desc: "Soyez notifie des qu'un nouveau dispositif correspond a votre profil. Certaines aides ont des deadlines - ne manquez plus jamais une opportunite.",
                highlight: "Email mensuel personnalise (offre annuelle)",
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
              Transparence totale. Paiement securise Stripe. Resiliable a tout moment.
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8 mt-12">
            {/* Decouverte */}
            <div className="bg-white border-[3px] border-slate-200 rounded-3xl p-10 relative hover:-translate-y-2 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-slate-900">Decouverte</h3>
              <p className="text-slate-500 mt-1">Ideal pour un premier diagnostic</p>
              <div className="my-6">
                <span className="text-6xl font-extrabold text-blue-800">49 EUR</span>
                <div className="text-lg text-slate-500">30 jours</div>
              </div>
              <ul className="space-y-0">
                {[
                  "Simulation et identification des aides",
                  "Rapport PDF detaille",
                  "Scores d'eligibilite personnalises",
                  "Montants historiques reels",
                  "Assistant IA expert",
                  "Support",
                ].map((item, j, arr) => (
                  <li key={j} className={`py-3.5 flex items-start gap-3 text-sm ${j < arr.length - 1 ? 'border-b border-slate-200' : ''}`}>
                    <span className="text-emerald-600 font-extrabold text-xl flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl mt-6 text-center">
                <h4 className="text-emerald-700 font-bold">Vos donnees vous appartiennent</h4>
                <p className="text-slate-600 text-sm">Aucune revente. Aucun partage. 100% confidentiel.</p>
              </div>
              <button
                onClick={() => navigate("/signup?plan=decouverte")}
                className="w-full mt-6 px-8 py-4 bg-white text-blue-800 border-2 border-blue-800 rounded-lg font-semibold text-lg hover:-translate-y-0.5 transition-all"
              >
                Choisir Decouverte
              </button>
            </div>

            {/* Business - Featured */}
            <div className="bg-white border-[3px] border-blue-800 rounded-3xl p-10 relative shadow-xl shadow-blue-800/15">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-400 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-amber-500/30">
                RECOMMANDE
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mt-4">Business</h3>
              <p className="text-slate-500 mt-1">Pour un suivi optimal toute l'annee</p>
              <div className="my-6">
                <span className="text-6xl font-extrabold text-blue-800">149 EUR</span>
                <div className="text-lg text-slate-500">par an</div>
              </div>
              <ul className="space-y-0">
                {[
                  "Simulation et identification des aides",
                  "Rapport PDF detaille",
                  "Scores d'eligibilite personnalises",
                  "Montants historiques reels",
                  "Assistant IA expert illimite",
                  "Support",
                  "Moteur de recherche (10 000+ aides)",
                  "Alertes email personnalisees",
                  "Historique et suivi",
                ].map((item, j, arr) => (
                  <li key={j} className={`py-3.5 flex items-start gap-3 text-sm ${j < arr.length - 1 ? 'border-b border-slate-200' : ''}`}>
                    <span className="text-emerald-600 font-extrabold text-xl flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl mt-6 text-center">
                <h4 className="text-emerald-700 font-bold">Vos donnees vous appartiennent</h4>
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
              <p className="text-slate-500 mt-1">Pour holdings et groupes multi-societes</p>
              <div className="my-6">
                <span className="text-6xl font-extrabold text-blue-800">299 EUR</span>
                <div className="text-lg text-slate-500">par an</div>
                <div className="text-sm text-slate-500 mt-1">+ 29 EUR par pack de 10 societes supplementaires</div>
              </div>
              <ul className="space-y-0">
                {[
                  "Simulation et identification des aides",
                  "Rapport PDF detaille",
                  "Scores d'eligibilite personnalises",
                  "Montants historiques reels",
                  "Assistant IA expert illimite",
                  "Support",
                  "Moteur de recherche (10 000+ aides)",
                  "Alertes email personnalisees",
                  "Historique et suivi",
                  "Multi-societes (10 incluses)",
                ].map((item, j, arr) => (
                  <li key={j} className={`py-3.5 flex items-start gap-3 text-sm ${j < arr.length - 1 ? 'border-b border-slate-200' : ''}`}>
                    <span className="text-emerald-600 font-extrabold text-xl flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl mt-6 text-center">
                <h4 className="text-emerald-700 font-bold">Vos donnees vous appartiennent</h4>
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
              Paiement 100% securise par Stripe (CB, Visa, Mastercard, SEPA)
            </p>
            <p className="text-slate-900 font-semibold">
              Garantie satisfait ou rembourse 14 jours - Sans engagement - Resiliable a tout moment
            </p>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-800 text-white py-20 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">
              Vos donnees en securite maximale
            </h2>
            <p className="text-xl opacity-90">
              Nous prenons la protection de vos donnees tres au serieux. Voici nos engagements fermes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {[
              {
                icon: "🔒",
                title: "Zero revente de donnees",
                desc: "Vos donnees ne seront JAMAIS vendues, louees ou cedees a des tiers. C'est un engagement absolu et irrevocable.",
              },
              {
                icon: "🇪🇺",
                title: "100% conforme RGPD",
                desc: "Respect total du reglement europeen. DPO dedie. Hebergement UE exclusivement. Infrastructure certifiee SOC 2 Type 2.",
              },
              {
                icon: "🤖",
                title: "IA ethique et privee",
                desc: "Vos donnees ne servent PAS a entrainer nos IA. Traitement 100% confidentiel sur nos serveurs. Conforme IA Act europeen.",
              },
            ].map((card, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20">
                <h3 className="text-xl font-bold mb-4">{card.icon} {card.title}</h3>
                <p className="opacity-90 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 p-8 bg-white/15 rounded-xl text-center">
            <h3 className="text-2xl font-bold mb-4">VOS DONNEES VOUS APPARTIENNENT</h3>
            <p className="text-lg opacity-95 leading-relaxed">
              Aucune utilisation commerciale. Aucun partage. Aucune revente. Vos informations sont utilisees UNIQUEMENT pour vous fournir le service souscrit. Point final.
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
                La plateforme d'intelligence artificielle qui identifie toutes vos aides publiques. Propulsee par subvention360, la reference des professionnels du financement.
              </p>
              <p className="font-semibold">
                contact@masubventionpro.com<br />
                dpo@masubventionpro.com
              </p>
            </div>

            {/* Entreprise */}
            <div>
              <h5 className="text-lg font-semibold mb-4">Entreprise</h5>
              <div className="space-y-3">
                <a href="#" className="block text-white/70 hover:text-white transition-colors">A propos</a>
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
              <h5 className="text-lg font-semibold mb-4">Legal</h5>
              <div className="space-y-3">
                <a href="#cgu" className="block text-white/70 hover:text-white transition-colors">Mentions legales</a>
                <a href="#cgu" className="block text-white/70 hover:text-white transition-colors">CGU</a>
                <a href="#cgu" className="block text-white/70 hover:text-white transition-colors">Politique RGPD</a>
                <a href="#cgu" className="block text-white/70 hover:text-white transition-colors">Cookies</a>
              </div>
            </div>

            {/* Professionnels */}
            <div>
              <h5 className="text-lg font-semibold mb-4">Professionnels</h5>
              <div className="space-y-3">
                <a href="https://subvention360.com" target="_blank" rel="noopener noreferrer" className="block text-white/70 hover:text-white transition-colors">subvention360 Pro</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors">Devenir partenaire</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors">API</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors">Affiliation</a>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-white/5 p-6 rounded-xl mb-8 max-w-[900px] mx-auto">
            <p className="text-white/80 text-sm leading-relaxed">
              <strong>Disclaimer important :</strong> MaSubventionPro est un outil d'identification et d'analyse des aides publiques disponibles. Nous ne garantissons pas l'obtention des aides identifiees. L'eligibilite effective, la constitution des dossiers de demande et l'attribution finale relevent de votre responsabilite et des decisions souveraines des organismes attributeurs (Etat, Regions, Communes, Europe, BPI France, etc.). Les montants estimes sont indicatifs et bases sur des donnees historiques. MaSubventionPro ne se substitue pas a un expert-comptable, avocat ou conseil en financement pour la constitution de vos dossiers.
            </p>
          </div>

          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-white/50 text-sm">
              2026 MaSubventionPro. Tous droits reserves. | Propulse par subvention360
            </p>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">Donnees hebergees en Europe (UE)</span>
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">100% conforme RGPD</span>
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">Infrastructure SOC 2 Type 2</span>
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">Conforme IA Act</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Profile Creation Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {showResults ? "Vos aides identifiees" :
                   isAnalyzing ? "Analyse en cours" :
                   !profileType ? "Creation de profil" :
                   profileType === 'entreprise' ? "Creation de profil - Entreprise" :
                   "Creation de profil - Entreprise en creation"}
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
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      Analyse en cours
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      Nous analysons votre profil
                    </h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                      Notre IA compare votre entreprise avec plus de {subsidyCount} dispositifs d'aides publiques pour identifier toutes vos opportunites.
                    </p>
                  </div>

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
                        Etape {analysisStep + 1} sur {analysisSteps.length}
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
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Etapes de l'analyse</h4>
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
                              <span className="text-xs text-emerald-600 font-medium">Termine</span>
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

                  {/* Value Reminder */}
                  <div className="max-w-lg mx-auto mt-8 text-center">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-amber-800 text-sm">
                        <span className="font-bold">Saviez-vous ?</span> En moyenne, les entreprises passent a cote de <strong>3 a 5 aides</strong> auxquelles elles sont eligibles. Notre analyse exhaustive vous evite de laisser de l'argent sur la table.
                      </p>
                    </div>
                  </div>

                  {/* Don't close warning */}
                  <div className="max-w-lg mx-auto mt-4 text-center">
                    <p className="text-slate-400 text-xs">
                      Ne fermez pas cette fenetre pendant l'analyse
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

                // Use real results if available, fallback to mock data
                const displaySubsidies = analysisResults?.matchedSubsidies || mockSubsidies
                const displayAmount = analysisResults?.totalAmount || totalPotentialAmount
                const displayCategories = analysisResults?.categories || categories
                const displayVisible = displaySubsidies.slice(0, 3)
                const displayLocked = displaySubsidies.slice(3)

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
                      <h3 className="text-xl font-bold">Resultats de votre simulation</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/20 rounded-lg p-4 text-center">
                        <div className="text-3xl font-extrabold">{displaySubsidies.length}</div>
                        <div className="text-sm opacity-90">Aides identifiees</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-4 text-center">
                        <div className="text-3xl font-extrabold">{displayAmount}</div>
                        <div className="text-sm opacity-90">Montant potentiel</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-4 text-center">
                        <div className="text-3xl font-extrabold">{displayCategories.length}</div>
                        <div className="text-sm opacity-90">{displayCategories.length === 1 ? "Categorie" : "Categories"}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {displayCategories.map((cat) => (
                        <span key={cat} className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Visible Preview Cards */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-slate-900">Aides correspondant a votre profil</h4>
                      <span className="text-sm text-slate-500">Apercu limite - {displayVisible.length} sur {displaySubsidies.length}</span>
                    </div>

                    <div className="space-y-3">
                      {displayVisible.map((subsidy: any) => (
                        <div key={subsidy.id} className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-bold text-slate-900">{getTitle(subsidy)}</h5>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  subsidy.eligibilityScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                  subsidy.eligibilityScore >= 60 ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {subsidy.eligibilityScore}% eligible
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  {subsidy.funding_type || subsidy.type || "Aide"}
                                </span>
                                <span>{subsidy.agency || subsidy.source || "Source officielle"}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Locked details */}
                              <div className="flex items-center gap-2 text-slate-400">
                                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs">
                                  <Lock className="w-3 h-3" />
                                  <span>Montant</span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs">
                                  <Lock className="w-3 h-3" />
                                  <span>Deadline</span>
                                </div>
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
                                <h5 className="font-bold text-slate-600">{getTitle(subsidy)}</h5>
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-500">
                                  {subsidy.eligibilityScore}% eligible
                                </span>
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
                          +{Math.max(0, displayLocked.length - 3)} autres aides identifiees
                        </h4>
                        <p className="text-slate-500 text-sm mb-4">
                          Debloquez l'acces complet : montants, deadlines, contacts et guide de demande
                        </p>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Upgrade CTA */}
                  <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="text-center mb-6">
                      <h4 className="text-xl font-bold text-slate-900 mb-2">
                        Debloquez toutes vos opportunites
                      </h4>
                      <p className="text-slate-600">
                        Accedez aux details complets des {displaySubsidies.length} aides identifiees pour votre entreprise
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Decouverte Option */}
                      <div className="bg-white rounded-xl p-5 border-2 border-slate-200 hover:border-blue-400 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-bold text-slate-900">Decouverte</h5>
                          <span className="text-2xl font-extrabold text-blue-800">49 EUR</span>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600 mb-4">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Acces 30 jours
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Tous les details des aides
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Rapport PDF complet
                          </li>
                        </ul>
                        <button
                          onClick={() => handleUpgrade('decouverte')}
                          className="w-full py-2.5 border-2 border-blue-800 text-blue-800 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                        >
                          Choisir Decouverte
                        </button>
                      </div>

                      {/* Business Option */}
                      <div className="bg-white rounded-xl p-5 border-2 border-blue-800 shadow-lg shadow-blue-800/10 relative">
                        <div className="absolute -top-3 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          RECOMMANDE
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-bold text-slate-900">Business</h5>
                          <span className="text-2xl font-extrabold text-blue-800">149 EUR<span className="text-sm font-normal text-slate-500">/an</span></span>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600 mb-4">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Acces illimite 1 an
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Alertes nouvelles aides
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Moteur de recherche complet
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
                      Paiement securise par Stripe - Satisfait ou rembourse 14 jours
                    </p>
                  </div>

                  {/* Close button */}
                  <div className="text-center">
                    <button
                      onClick={closeResultsAndReset}
                      className="text-slate-500 hover:text-slate-700 text-sm underline"
                    >
                      Fermer et revenir a l'accueil
                    </button>
                  </div>
                </div>
              )})()}

              {/* Type Selection */}
              {!profileType && !showResults && !isAnalyzing && (
                <div className="space-y-4 max-w-lg mx-auto">
                  <p className="text-center text-slate-500 mb-6">Choisissez votre situation</p>

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
                        <p className="text-slate-500 text-sm mb-3">Vous avez deja une entreprise immatriculee</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Enrichissement automatique SIRET</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Donnees pre-remplies</span>
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
                        <span className="text-2xl">🚀</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600">Creation / Reprise d'entreprise</h4>
                        <p className="text-slate-500 text-sm mb-3">Vous envisagez de creer ou reprendre une activite</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Aides a la creation incluses</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Accompagnement personnalise</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors mt-1" />
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
                        Rechercher des entreprises francaises <span className="text-red-500">*</span>
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
                            <span className="font-semibold text-sm">Entreprise selectionnee</span>
                          </div>
                          <p className="text-slate-700 text-sm mt-1">{profileData.companyName}</p>
                          <p className="text-xs text-slate-500">SIRET: {profileData.siret}</p>
                        </div>
                      )}
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        Site web de l'entreprise <span className="text-slate-400 font-normal">(Recommande)</span>
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
                        Description <span className="text-slate-400 font-normal">(Recommande)</span>
                      </label>
                      <textarea
                        value={profileData.description}
                        onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                        placeholder="Breve description de vos activites commerciales..."
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors resize-none"
                      />
                    </div>

                    {/* Documents */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        Documents <span className="text-slate-400 font-normal">(Recommande)</span>
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
                        <span className="text-sm font-semibold text-slate-700">Etapes</span>
                        <span className="text-sm font-bold text-blue-800">{entrepriseCompletion()}/4</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium ${profileData.siret ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {profileData.siret ? '✓' : '○'} SIRET
                          </span>
                          <span className="text-red-500 text-xs">Obligatoire</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium ${profileData.website ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {profileData.website ? '✓' : '○'} Site web
                          </span>
                          <span className="text-slate-400 text-xs">Recommande</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium ${profileData.description ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {profileData.description ? '✓' : '○'} Description
                          </span>
                          <span className="text-slate-400 text-xs">Recommande</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium ${documents.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {documents.length > 0 ? '✓' : '○'} Documents
                          </span>
                          <span className="text-slate-400 text-xs">Recommande</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm text-amber-800">
                        <span className="font-bold">Conseil :</span> Un profil complet peut doubler le nombre de subventions pertinentes trouvees.
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
                        1. Nom prevu pour l'entreprise en creation ou reprise <span className="text-red-500">*</span>
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
                        2. Secteur d'activite <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={profileData.sector}
                        onChange={(e) => setProfileData({ ...profileData, sector: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors appearance-none bg-white"
                      >
                        <option value="">Selectionnez le secteur</option>
                        {sectors.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Region */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        3. Region d'implantation <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={profileData.region}
                        onChange={(e) => setProfileData({ ...profileData, region: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors appearance-none bg-white"
                      >
                        <option value="">Selectionnez la region</option>
                        <option value="A determiner">A determiner</option>
                        {regions.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        4. Site web de l'entreprise <span className="text-slate-400 font-normal">(Recommande)</span>
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
                        5. Description <span className="text-slate-400 font-normal">(Recommande)</span>
                      </label>
                      <textarea
                        value={profileData.description}
                        onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                        placeholder="Breve description des activites commerciales..."
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-blue-800 transition-colors resize-none"
                      />
                    </div>

                    {/* Documents */}
                    <div>
                      <label className="block mb-2 font-semibold text-slate-900 text-sm">
                        6. Documents <span className="text-slate-400 font-normal">(Recommande)</span>
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
                        <span className="text-sm font-semibold text-slate-700">Etapes</span>
                        <span className="text-sm font-bold text-blue-800">{creationCompletion()}/6</span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className={`font-medium ${profileData.companyName ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {profileData.companyName ? '✓' : '○'} Nom de l'entreprise
                          </span>
                          <span className="text-red-500 text-xs ml-2">Obligatoire</span>
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium ${profileData.sector ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {profileData.sector ? '✓' : '○'} Secteur d'activite
                          </span>
                          <span className="text-red-500 text-xs ml-2">Obligatoire</span>
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium ${profileData.region ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {profileData.region ? '✓' : '○'} Region d'implantation
                          </span>
                          <span className="text-red-500 text-xs ml-2">Obligatoire</span>
                          <p className="text-xs text-slate-400 mt-1">Choisissez "A determiner" pour explorer les aides dans differentes regions.</p>
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium ${profileData.website ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {profileData.website ? '✓' : '○'} Site web
                          </span>
                          <span className="text-slate-400 text-xs ml-2">Recommande</span>
                          <p className="text-xs text-slate-400 mt-1">Notre IA analyse le site pour identifier des aides ciblees.</p>
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium ${profileData.description ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {profileData.description ? '✓' : '○'} Description
                          </span>
                          <span className="text-slate-400 text-xs ml-2">Recommande</span>
                          <p className="text-xs text-slate-400 mt-1">Plus les activites sont detaillees, plus les resultats seront pertinents.</p>
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium ${documents.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {documents.length > 0 ? '✓' : '○'} Documents
                          </span>
                          <span className="text-slate-400 text-xs ml-2">Recommande</span>
                          <p className="text-xs text-slate-400 mt-1">Business plan, Kbis ou presentation pour une analyse approfondie.</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm text-amber-800">
                        <span className="font-bold">Conseil :</span> Un profil complet peut doubler le nombre de subventions pertinentes trouvees.
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
                  disabled={profileType === 'entreprise' ? !profileData.siret : (!profileData.companyName || !profileData.sector || !profileData.region)}
                  className="flex-1 px-6 py-3 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-800/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  Creer le profil
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
