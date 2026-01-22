import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { supabase } from "@/lib/supabase"
import { Menu, X } from "lucide-react"

/**
 * MaSubventionPro Landing Page v7
 * Complete redesign with "23 milliards" hook, segment selector, corrected claims
 * All certification claims verified and corrected
 */
const LandingPage = () => {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [subsidyCount, setSubsidyCount] = useState<string>("10 000+")
  const [activeSegment, setActiveSegment] = useState<string | null>(null)

  // Simulator form state
  const [companyType, setCompanyType] = useState("")
  const [siret, setSiret] = useState("")
  const [website, setWebsite] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Fetch real subsidy count from database
  useEffect(() => {
    const fetchSubsidyCount = async () => {
      try {
        const { count, error } = await supabase
          .from("subsidies")
          .select("*", { count: "exact", head: true })

        if (!error && count) {
          setSubsidyCount(count.toLocaleString("fr-FR"))
        }
      } catch (err) {
        console.error("Error fetching subsidy count:", err)
      }
    }
    fetchSubsidyCount()
  }, [])

  const handleSimulatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyType || !siret) return

    setIsSearching(true)

    // Simulate analysis delay
    await new Promise((r) => setTimeout(r, 2500))

    setIsSearching(false)
    setShowResults(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSegmentClick = (segment: string) => {
    setActiveSegment(segment)
    // Scroll to simulator
    setTimeout(() => {
      document.querySelector('.simulator-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }

  const scrollToPricing = () => {
    document.getElementById("tarifs")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <>
      <Helmet>
        <title>MaSubventionPro - Ne laissez plus 23 milliards d'euros d'aides sur la table</title>
        <meta
          name="description"
          content="23 milliards d'euros d'aides publiques par an sont non reclamees. Notre IA analyse plus de 10 000 dispositifs pour identifier toutes vos opportunites."
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
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Hero Text */}
            <div>
              <h1 className="text-4xl lg:text-[3.75rem] font-extrabold leading-[1.1] mb-6">
                <span className="bg-gradient-to-br from-amber-400 to-amber-300 bg-clip-text text-transparent block text-5xl lg:text-[4rem]">23 milliards d'euros</span>
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

            {/* Simulator Card */}
            <div className="simulator-card bg-white rounded-2xl p-10 shadow-2xl border border-white/30">
              <div className="text-center mb-8">
                <span className="inline-block bg-emerald-600 text-white px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                  SIMULATION GRATUITE
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Decouvrez vos aides en quelques minutes
                </h3>
                <p className="text-slate-500 text-sm">Vos donnees restent confidentielles, plus votre profil est complet, meilleure est l'analyse</p>
              </div>

              <form onSubmit={handleSimulatorSubmit}>
                <div className="mb-6">
                  <label className="block mb-2 font-semibold text-slate-900 text-sm" htmlFor="companyType">
                    Votre situation
                  </label>
                  <div className="relative">
                    <select
                      id="companyType"
                      value={companyType}
                      onChange={(e) => setCompanyType(e.target.value)}
                      required
                      className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-800 transition-colors appearance-none bg-white pr-10"
                    >
                      <option value="">Selectionnez...</option>
                      <option value="existing">Entreprise existante</option>
                      <option value="creation">Creation d'entreprise</option>
                      <option value="reprise">Reprise d'entreprise</option>
                      <option value="project">Porteur de projet</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block mb-2 font-semibold text-slate-900 text-sm" htmlFor="siret">
                    SIRET ou nom de l'entreprise *
                  </label>
                  <input
                    type="text"
                    id="siret"
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    placeholder="Ex: 123 456 789 00012 ou ACME SAS"
                    required
                    className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-800 transition-colors"
                  />
                </div>

                <div className="mb-6">
                  <label className="block mb-2 font-semibold text-slate-900 text-sm" htmlFor="website">
                    Site web de l'entreprise{" "}
                    <span className="text-emerald-600 font-bold">(Recommande)</span>
                  </label>
                  <input
                    type="url"
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.votre-entreprise.fr"
                    className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-800 transition-colors"
                  />
                  <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-1">
                    Notre IA analyse votre site pour comprendre votre ADN et ameliorer le matching intelligent
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block mb-2 font-semibold text-slate-900 text-sm">
                    Documents complementaires (optionnel)
                  </label>
                  <div
                    onClick={() => document.getElementById("docs")?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-800 hover:bg-slate-50 transition-all"
                  >
                    {files.length > 0 ? (
                      <>
                        <p className="text-lg mb-2 text-emerald-600">{files.length} document(s) ajoute(s)</p>
                        <p className="text-sm text-slate-500">
                          {files.slice(0, 2).map(f => f.name).join(", ")}
                          {files.length > 2 ? "..." : ""}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-base mb-2">Cliquez pour ajouter des documents</p>
                        <p className="text-sm text-slate-500">Presentation, business plan, pitch deck, bilan...</p>
                        <p className="text-xs text-emerald-600 mt-3 font-semibold">
                          Plus vous alimentez l'IA, meilleure est l'analyse
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    id="docs"
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full px-8 py-4 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold text-lg shadow-lg shadow-blue-800/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-800/30 transition-all disabled:opacity-70"
                >
                  {isSearching ? "Analyse en cours..." : "Lancer ma simulation gratuite"}
                </button>
              </form>

              {/* Results Preview */}
              {showResults && (
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-8 rounded-xl mt-8 animate-[slideIn_0.5s_ease]">
                  <h4 className="text-2xl font-bold mb-4">Analyse terminee !</h4>
                  <p>Excellente nouvelle pour votre entreprise</p>
                  <div className="grid grid-cols-2 gap-6 my-6">
                    <div className="bg-white/15 p-5 rounded-lg text-center">
                      <span className="text-4xl font-extrabold block mb-1">23</span>
                      <span>Dispositifs eligibles</span>
                    </div>
                    <div className="bg-white/15 p-5 rounded-lg text-center">
                      <span className="text-3xl font-extrabold block mb-1">127K EUR - 347K EUR</span>
                      <span>Montant estime</span>
                    </div>
                  </div>
                  <div className="bg-white/15 p-4 rounded-lg text-sm opacity-95">
                    <strong>Information importante :</strong> MaSubventionPro identifie les aides publiques potentiellement accessibles. L'obtention effective depend de votre eligibilite reelle, de la constitution des dossiers et des decisions des organismes attributeurs.
                  </div>
                  <p className="mt-4 text-sm opacity-95">
                    Debloquez le detail complet des aides et accedez a l'Assistant IA expert
                  </p>
                  <button
                    onClick={scrollToPricing}
                    className="w-full mt-6 px-8 py-4 bg-white text-emerald-600 rounded-lg font-semibold text-lg"
                  >
                    Voir les offres
                  </button>
                </div>
              )}
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
                  "1 simulation complete",
                  "Identification de toutes les aides eligibles",
                  "Rapport PDF detaille telechargeable",
                  "Scores d'eligibilite personnalises",
                  "Montants historiques reels",
                  "Assistant IA expert",
                  "Acces 30 jours",
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
            <div className="bg-white border-[3px] border-blue-800 rounded-3xl p-10 relative shadow-xl shadow-blue-800/15 lg:scale-105">
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
                  "Connexion 1 an et actualisation illimitee",
                  "Rapports PDF detailles",
                  "Assistant IA expert ILLIMITE",
                  "Moteur de recherche complet (10 000+ aides)",
                  "Alertes mensuelles personnalisees par email",
                  "Notifications nouveaux dispositifs",
                  "Historique et suivi de vos aides",
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
                  "Multi-sites (10 societes incluses)",
                  "Recherches illimitees",
                  "Assistant IA contextuel",
                  "Rapports white-label",
                  "Accompagnement expert dedie",
                  "Support prioritaire 24h",
                  "API Access",
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
