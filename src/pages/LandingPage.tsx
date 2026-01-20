import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import {
  Bot,
  RefreshCw,
  FileText,
  Search,
  Check,
  ArrowRight,
  Menu,
  X,
} from "lucide-react"

/**
 * MaSubventionPro Landing Page
 * B2B landing page for professional consultants and accountants
 * Shares the same Supabase backend as subvention360.com
 */
const LandingPage = () => {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [subsidyCount, setSubsidyCount] = useState<string>("5 000+")

  // Simulator form state
  const [sector, setSector] = useState("")
  const [region, setRegion] = useState("")
  const [employees, setEmployees] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  // Fetch real subsidy count from database
  useEffect(() => {
    const fetchSubsidyCount = async () => {
      try {
        const { count, error } = await supabase
          .from("subsidies")
          .select("*", { count: "exact", head: true })

        if (!error && count) {
          const roundedThousand = Math.floor(count / 1000) * 1000
          const formattedRaw = roundedThousand.toLocaleString("fr-FR")
          setSubsidyCount(formattedRaw + "+")
        }
      } catch (err) {
        console.error("Error fetching subsidy count:", err)
      }
    }
    fetchSubsidyCount()
  }, [])

  const handleSimulatorSubmit = async () => {
    if (!sector || !region) {
      return
    }
    setIsSearching(true)

    // Redirect to subvention360.com search with pre-filled parameters
    const params = new URLSearchParams()
    if (sector) params.set("sector", sector)
    if (region) params.set("region", region)
    if (employees) params.set("employees", employees)
    params.set("source", "masubventionpro")

    // Short delay for UX
    await new Promise((r) => setTimeout(r, 500))

    // Open search in subvention360.com (or keep in-app if user is authenticated)
    window.location.href = `https://subvention360.com/subventions/recherche?${params.toString()}`
  }

  const features = [
    {
      icon: Bot,
      title: "Matching IA",
      description:
        "Notre algorithme analyse le profil de vos clients et identifie les aides les plus pertinentes automatiquement.",
    },
    {
      icon: RefreshCw,
      title: "Mise a jour continue",
      description:
        "Base de donnees actualisee quotidiennement avec les nouveaux dispositifs et dates limites.",
    },
    {
      icon: FileText,
      title: "Rapports personnalises",
      description:
        "Generez des rapports d'eligibilite professionnels a votre marque pour vos clients.",
    },
  ]

  // Pricing: Left to right (cheapest to most expensive)
  const pricingPlans = [
    {
      name: "Decouverte",
      subtitle: "Pour commencer",
      price: "49",
      period: "",
      features: [
        "50 recherches",
        "Base complete des aides",
        "Filtres par region/secteur",
        "Export PDF basique",
        "Support email",
      ],
      featured: false,
      cta: "Demarrer maintenant",
    },
    {
      name: "Business",
      subtitle: "Le choix des PME",
      price: "149",
      period: "/an",
      features: [
        "200 recherches/mois",
        "Matching IA avance",
        "Rapports personnalises",
        "Alertes nouveaux dispositifs",
        "Support email prioritaire",
      ],
      featured: true,
      badge: "RECOMMANDE",
      cta: "Choisir Business",
    },
    {
      name: "Premium",
      subtitle: "Pour les groupes & cabinets",
      price: "299",
      period: "/an",
      features: [
        "Multi-sites (10 societes incluses)",
        "Recherches illimitees",
        "Assistant IA contextuel",
        "Rapports white-label",
        "Accompagnement expert dedie",
        "Support prioritaire 24h",
        "API Access",
      ],
      featured: false,
      cta: "Choisir Premium",
    },
  ]

  const sectors = [
    { value: "agriculture", label: "Agriculture" },
    { value: "industrie", label: "Industrie" },
    { value: "services", label: "Services" },
    { value: "commerce", label: "Commerce" },
    { value: "tech", label: "Tech / Numerique" },
  ]

  const regions = [
    { value: "ile-de-france", label: "Ile-de-France" },
    { value: "auvergne-rhone-alpes", label: "Auvergne-Rhone-Alpes" },
    { value: "nouvelle-aquitaine", label: "Nouvelle-Aquitaine" },
    { value: "occitanie", label: "Occitanie" },
    { value: "autre", label: "Autre" },
  ]

  return (
    <>
      <Helmet>
        <title>MaSubventionPro - Aides Publiques pour Entreprises</title>
        <meta
          name="description"
          content="Identifiez en quelques clics les subventions adaptees a vos clients parmi plus de 5 000 dispositifs. Gagnez du temps, maximisez les financements."
        />
        <link rel="canonical" href="https://masubventionpro.com" />
      </Helmet>

      {/* Header */}
      <header className="bg-white shadow-sm px-4 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="text-xl lg:text-2xl font-extrabold bg-gradient-to-r from-blue-800 to-emerald-600 bg-clip-text text-transparent">
          MaSubventionPro
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-slate-900 font-medium hover:text-blue-600 transition-colors"
          >
            Fonctionnalites
          </a>
          <a
            href="#pricing"
            className="text-slate-900 font-medium hover:text-blue-600 transition-colors"
          >
            Tarifs
          </a>
          <a
            href="#contact"
            className="text-slate-900 font-medium hover:text-blue-600 transition-colors"
          >
            Contact
          </a>
          <Button onClick={() => navigate("/signup")}>
            S'inscrire
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b px-4 py-4 space-y-4">
          <a href="#features" className="block text-slate-900 font-medium">
            Fonctionnalites
          </a>
          <a href="#pricing" className="block text-slate-900 font-medium">
            Tarifs
          </a>
          <a href="#contact" className="block text-slate-900 font-medium">
            Contact
          </a>
          <Button
            onClick={() => navigate("/signup")}
            className="w-full"
          >
            S'inscrire
          </Button>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12 lg:py-20 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Hero Text */}
          <div className="space-y-6">
            <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
              L'Intelligence des{" "}
              <span className="text-amber-400">Aides Publiques</span> pour Votre
              Entreprise
            </h1>
            <p className="text-lg lg:text-xl opacity-90">
              Identifiez en quelques clics les subventions adaptees a vos
              clients parmi plus de {subsidyCount} dispositifs. Gagnez du temps,
              maximisez les financements.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">
                <Bot className="inline w-4 h-4 mr-1" /> Matching IA
              </span>
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">
                <FileText className="inline w-4 h-4 mr-1" /> {subsidyCount}{" "}
                subventions
              </span>
              <span className="bg-white/10 px-4 py-2 rounded-full text-sm">
                <Search className="inline w-4 h-4 mr-1" /> Resultats instantanes
              </span>
            </div>
          </div>

          {/* Simulator Card */}
          <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-2xl">
            <div className="text-center mb-6">
              <span className="inline-block bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-semibold mb-3">
                100% GRATUIT
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                Simulateur d'Eligibilite
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-1 block">Secteur d'activite</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez un secteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block">Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez une region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block">Effectif</Label>
                <Input
                  type="number"
                  placeholder="Nombre de salaries"
                  value={employees}
                  onChange={(e) => setEmployees(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSimulatorSubmit}
                disabled={!sector || !region || isSearching}
                className="w-full py-6 text-lg"
              >
                {isSearching ? (
                  "Recherche en cours..."
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Decouvrir mes aides
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-slate-50 py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-blue-800 to-emerald-600 bg-clip-text text-transparent">
              {subsidyCount}
            </div>
            <p className="text-slate-600 font-semibold mt-1">
              Subventions referencees
            </p>
          </div>
          <div>
            <div className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-blue-800 to-emerald-600 bg-clip-text text-transparent">
              98%
            </div>
            <p className="text-slate-600 font-semibold mt-1">
              Taux de satisfaction
            </p>
          </div>
          <div>
            <div className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-blue-800 to-emerald-600 bg-clip-text text-transparent">
              2 500+
            </div>
            <p className="text-slate-600 font-semibold mt-1">
              Professionnels actifs
            </p>
          </div>
          <div>
            <div className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-blue-800 to-emerald-600 bg-clip-text text-transparent">
              50M
            </div>
            <p className="text-slate-600 font-semibold mt-1">
              Financements obtenus
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Pourquoi choisir MaSubventionPro ?
            </h2>
            <p className="text-slate-600 text-lg">
              Des outils puissants pour les professionnels du conseil
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-slate-50 py-16 lg:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Tarifs transparents
            </h2>
            <p className="text-slate-600 text-lg">
              Choisissez la formule adaptee a votre activite
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 text-center relative ${
                  plan.featured
                    ? "border-2 border-blue-600 scale-105 shadow-xl"
                    : "border-2 border-slate-200"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-2xl font-bold text-slate-900">
                  {plan.name}
                </h3>
                <p className="text-slate-500 mt-1">{plan.subtitle}</p>
                <div className="my-6">
                  <span className="text-5xl font-extrabold text-blue-800">
                    {plan.price}€
                  </span>
                  {plan.period && (
                    <span className="text-slate-500">{plan.period}</span>
                  )}
                </div>
                <ul className="text-left space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 py-2 border-b border-slate-100"
                    >
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate("/signup")}
                  variant={plan.featured ? "default" : "secondary"}
                  className="w-full"
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4">
            MaSubventionPro
          </div>
          <p className="text-slate-400 mb-6">
            Une solution{" "}
            <a
              href="https://subvention360.com"
              className="text-blue-400 hover:underline"
            >
              Subvention360
            </a>
          </p>
          <div className="flex justify-center gap-8 text-sm text-slate-400">
            <a href="https://subvention360.com/privacy" className="hover:text-white transition-colors">
              Confidentialite
            </a>
            <a href="https://subvention360.com/terms" className="hover:text-white transition-colors">
              CGU
            </a>
            <a href="https://subvention360.com/contact" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
          <p className="mt-8 text-slate-500 text-sm">
            2025 MaSubventionPro - Tous droits reserves
          </p>
        </div>
      </footer>
    </>
  )
}

export default LandingPage
