import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Menu, X, Rocket, Target, Handshake, CheckCircle, Lightbulb, Building2, Users, Calendar, Bot, ChevronDown, ChevronUp } from 'lucide-react';

export default function NotreHistoirePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Helmet>
        <title>Notre Histoire | MaSubventionPro - Trouvez vos subventions et aides publiques</title>
        <meta name="description" content="Découvrez l'histoire de MaSubventionPro et subvention360 : la plateforme qui démocratise l'accès aux 10 000+ aides publiques en France. De l'Europe à votre commune, en quelques minutes." />
        <meta name="keywords" content="MaSubventionPro, subvention360, aides publiques, subventions entreprises, financement PME, Assistant IA, aides Europe, aides nationales, aides locales" />
        <link rel="canonical" href="https://masubventionpro.com/notre-histoire" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://masubventionpro.com/notre-histoire" />
        <meta property="og:title" content="Notre Histoire | MaSubventionPro" />
        <meta property="og:description" content="Découvrez comment nous avons créé la plateforme d'aides publiques la plus complète du marché avec plus de 10 000 dispositifs référencés." />
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header - Same as Landing Page */}
        <header className="bg-white shadow-sm fixed w-full top-0 z-[1000]">
          <div className="max-w-[1400px] mx-auto px-8 py-4 flex justify-between items-center">
            <Link to="/">
              <img src="/logo.svg" alt="MaSubventionPro" className="h-8" />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-10">
              <Link to="/#profils" className="text-slate-900 font-medium hover:text-blue-800 transition-colors">
                Pour qui ?
              </Link>
              <Link to="/#fonctionnalites" className="text-slate-900 font-medium hover:text-blue-800 transition-colors">
                Fonctionnalités
              </Link>
              <Link to="/#tarifs" className="text-slate-900 font-medium hover:text-blue-800 transition-colors">
                Tarifs
              </Link>
              <Link to="/notre-histoire" className="text-blue-800 font-medium">
                Notre histoire
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 text-blue-800 border-2 border-blue-800 rounded-lg font-semibold hover:bg-blue-50 transition-all"
              >
                Connexion
              </Link>
              <Link
                to="/signup"
                className="px-6 py-3 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-800/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-800/30 transition-all"
              >
                S'inscrire
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
              <Link to="/#profils" className="block text-slate-900 font-medium">Pour qui ?</Link>
              <Link to="/#fonctionnalites" className="block text-slate-900 font-medium">Fonctionnalités</Link>
              <Link to="/#tarifs" className="block text-slate-900 font-medium">Tarifs</Link>
              <Link to="/notre-histoire" className="block text-blue-800 font-medium">Notre histoire</Link>
              <Link
                to="/login"
                className="block w-full text-center px-6 py-3 text-blue-800 border-2 border-blue-800 rounded-lg font-semibold"
              >
                Connexion
              </Link>
              <Link
                to="/signup"
                className="block w-full text-center px-6 py-3 bg-gradient-to-br from-blue-800 to-blue-500 text-white rounded-lg font-semibold"
              >
                S'inscrire
              </Link>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 text-white pt-24 pb-20 px-8 mt-[70px] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(5,150,105,0.1)_0%,transparent_50%)]" />
          <div className="max-w-[1400px] mx-auto relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Notre Histoire</h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto">
              L'évolution d'une mission : démocratiser l'accès aux aides publiques
            </p>
          </div>
        </section>

        {/* Le Constat Section */}
        <section className="bg-white py-20 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                Le constat qui a tout changé
              </h2>
              <p className="text-xl text-slate-500">
                Des milliards d'euros d'aides publiques restent non réclamés chaque année
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                  <Lightbulb className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Un système fragmenté</h3>
                <p className="text-slate-500 leading-relaxed">
                  Plus de 10 000 dispositifs d'aides répartis entre l'Europe, l'État, les régions, les départements et les communes. Un labyrinthe administratif complexe.
                </p>
                <div className="bg-slate-50 p-4 rounded-lg mt-4 text-sm font-semibold text-blue-800">
                  Complexité = Opportunités manquées
                </div>
              </div>

              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Un manque d'expertise</h3>
                <p className="text-slate-500 leading-relaxed">
                  Naviguer dans ce système demande du temps et une expertise que peu d'entreprises possèdent en interne. Les PME sont les plus impactées.
                </p>
                <div className="bg-slate-50 p-4 rounded-lg mt-4 text-sm font-semibold text-blue-800">
                  Les PME passent à côté de financements vitaux
                </div>
              </div>

              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Notre réponse</h3>
                <p className="text-slate-500 leading-relaxed">
                  Agir sur deux fronts : équiper les experts d'outils professionnels et donner un accès direct aux entreprises elles-mêmes.
                </p>
                <div className="bg-slate-50 p-4 rounded-lg mt-4 text-sm font-semibold text-blue-800">
                  Démocratiser l'accès aux aides publiques
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="bg-slate-50 py-20 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                Notre parcours
              </h2>
              <p className="text-xl text-slate-500">
                De l'idée à la plateforme de référence en France
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* 2025 */}
              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div className="text-blue-800 font-semibold text-sm uppercase tracking-wider mb-2">2025 - L'Origine</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">subvention360</h3>
                <p className="text-slate-500 leading-relaxed">
                  Lancement de notre plateforme professionnelle B2B pour les experts-comptables et cabinets de conseil. Outils de gestion multiclients pour accompagner efficacement leurs portefeuilles.
                </p>
                <div className="bg-slate-50 p-4 rounded-lg mt-4 text-sm font-semibold text-blue-800">
                  Base de données la plus exhaustive du marché
                </div>
              </div>

              {/* 2026 */}
              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="text-blue-800 font-semibold text-sm uppercase tracking-wider mb-2">2026 - L'Accès Direct</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">MaSubventionPro</h3>
                <p className="text-slate-500 leading-relaxed">
                  La puissance de notre technologie directement entre les mains des entreprises, créateurs, repreneurs et porteurs de projets. Identification des aides en quelques minutes.
                </p>
                <div className="bg-slate-50 p-4 rounded-lg mt-4 text-sm font-semibold text-blue-800">
                  Assistant IA Expert intégré
                </div>
              </div>

              {/* 2027 */}
              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <div className="text-blue-800 font-semibold text-sm uppercase tracking-wider mb-2">2027 et Au-delà</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">L'Accompagnement Complet</h3>
                <p className="text-slate-500 leading-relaxed">
                  Extension aux collectivités et associations. Création de dossiers soutenue par l'IA : contrôle de complétude, affinage de la motivation. L'IA au service de votre réussite.
                </p>
                <div className="bg-slate-50 p-4 rounded-lg mt-4 text-sm font-semibold text-blue-800">
                  Démocratisation pour tous les acteurs
                </div>
              </div>
            </div>

            {/* Highlight Box */}
            <div className="mt-12 bg-gradient-to-br from-amber-50 to-amber-100/50 border-2 border-amber-300 px-8 py-8 rounded-2xl max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-amber-700 mb-4 text-center">Ce qui nous rend uniques</h3>
              <p className="text-lg text-slate-700 leading-relaxed text-center">
                En quelques minutes, MaSubventionPro vous permet d'<strong className="text-amber-700">identifier</strong> les aides pertinentes,
                de <strong className="text-amber-700">comprendre</strong> les conditions d'éligibilité et d'<strong className="text-amber-700">accéder</strong> aux informations
                pour démarrer vos démarches.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-white py-20 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                Notre technologie en chiffres
              </h2>
              <p className="text-xl text-slate-500">
                La base de données la plus complète du marché français
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-6 bg-slate-50 rounded-xl text-center">
                <span className="text-4xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                  10 000+
                </span>
                <p className="text-slate-500 font-semibold text-sm">Dispositifs d'aides référencés</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl text-center">
                <span className="text-4xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                  Quotidien
                </span>
                <p className="text-slate-500 font-semibold text-sm">Mise à jour des données</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl text-center">
                <span className="text-4xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                  National
                </span>
                <p className="text-slate-500 font-semibold text-sm">Commune - Europe</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl text-center">
                <span className="text-4xl font-extrabold bg-gradient-to-br from-blue-800 to-emerald-600 bg-clip-text text-transparent block mb-2">
                  IA
                </span>
                <p className="text-slate-500 font-semibold text-sm">Assistant IA expert</p>
              </div>
            </div>

            <div className="mt-12 max-w-lg mx-auto">
              <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-8 rounded-2xl text-center text-white">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-90" />
                <div className="text-2xl font-bold mb-2">Assistant IA Expert</div>
                <div className="text-white/80">Conforme IA Act européen | Propulsé par Mistral</div>
              </div>
            </div>
          </div>
        </section>

        {/* Fondateurs Section */}
        <section className="bg-slate-50 py-20 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                Les Fondateurs
              </h2>
              <p className="text-xl text-slate-500">
                Une équipe complémentaire au service de votre réussite
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 text-center hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-800 to-emerald-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                  WR
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Wilfrid Rimbault</h3>
                <p className="text-blue-800 font-semibold mb-1">CEO & Co-fondateur</p>
                <p className="text-slate-500 mb-4">RW Strategy Agency</p>
                <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
                  25 ans d'expérience dans la logistique internationale
                </div>
              </div>

              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 text-center hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-800 to-emerald-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                  TW
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Thomas Wainstein</h3>
                <p className="text-blue-800 font-semibold mb-1">CTO & Co-fondateur</p>
                <p className="text-slate-500 mb-4">EcoEmit</p>
                <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
                  Expert en orchestration d'IA et systèmes intelligents
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Valeurs Section */}
        <section className="bg-white py-20 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                Nos Valeurs
              </h2>
              <p className="text-xl text-slate-500">
                Les principes qui guident chacune de nos actions
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all text-center">
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Innovation</h3>
                <p className="text-slate-500 leading-relaxed">L'IA au service de la simplification administrative, pour libérer le temps des conseillers.</p>
              </div>

              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all text-center">
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Précision</h3>
                <p className="text-slate-500 leading-relaxed">Une base de données exhaustive et constamment mise à jour pour ne manquer aucune opportunité.</p>
              </div>

              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all text-center">
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Handshake className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Engagement</h3>
                <p className="text-slate-500 leading-relaxed">Un partenariat durable avec nos utilisateurs, construisant ensemble la solution idéale.</p>
              </div>

              <div className="bg-white p-10 rounded-2xl border-2 border-slate-200 hover:border-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all text-center">
                <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-800 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Transparence</h3>
                <p className="text-slate-500 leading-relaxed">Des sources officielles, des données vérifiables, une confiance absolue.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-slate-50 py-20 px-8">
          <div className="max-w-[900px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
                Questions fréquentes
              </h2>
              <p className="text-xl text-slate-500">
                Tout ce que vous devez savoir sur notre histoire
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  question: "Combien de dispositifs d'aides MaSubventionPro référence-t-il ?",
                  answer: "MaSubventionPro référence plus de 10 000 dispositifs d'aides publiques, couvrant tous les niveaux : européen, national, régional, départemental et communal. C'est la base de données la plus complète du marché français."
                },
                {
                  question: "Quelle est la différence entre subvention360 et MaSubventionPro ?",
                  answer: "subvention360 (lancé en 2025) est une plateforme professionnelle B2B pour les experts-comptables et cabinets de conseil avec gestion multiclients. MaSubventionPro (lancé en 2026) est une plateforme B2C qui donne un accès direct aux entreprises, créateurs et repreneurs pour identifier leurs aides en quelques minutes."
                },
                {
                  question: "Qu'est-ce que l'Assistant IA Expert de MaSubventionPro ?",
                  answer: "L'Assistant IA Expert est un système d'intelligence artificielle conforme à l'IA Act européen, utilisant Mistral et d'autres modèles pour analyser votre projet en profondeur, approfondir votre démarche, renforcer votre motivation et vous apporter des conseils personnalisés basés sur des milliers de cas similaires."
                },
                {
                  question: "MaSubventionPro constitue-t-il les dossiers de demande de subventions ?",
                  answer: "Actuellement, MaSubventionPro identifie les aides pertinentes et vous donne accès aux informations pour démarrer vos démarches. À partir de 2027, nous développons des fonctionnalités d'accompagnement à la création de dossiers soutenues par l'IA : contrôle de complétude des documents, affinage de la motivation."
                },
                {
                  question: "Qui sont les fondateurs de MaSubventionPro ?",
                  answer: "MaSubventionPro a été cofondé par Wilfrid Rimbault (CEO, fondateur de RW Strategy Agency, 25 ans d'expérience dans la logistique internationale) et Thomas Wainstein (CTO, fondateur d'EcoEmit, expert en orchestration d'IA). Ensemble, ils ont également cofondé subvention360."
                }
              ].map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-800 transition-all overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full p-6 flex items-center justify-between text-left"
                  >
                    <h3 className="text-lg font-bold text-slate-900 pr-4">{faq.question}</h3>
                    {openFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-blue-800 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-slate-500 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="bg-gradient-to-br from-blue-900 to-blue-800 text-white py-20 px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold mb-4">
                Notre Vision
              </h2>
              <p className="text-xl opacity-90">
                Faire en sorte que chaque euro d'aide publique atteigne celui qui en a besoin
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20">
                <h3 className="text-xl font-bold mb-4">Pour les entreprises</h3>
                <p className="opacity-90 leading-relaxed">
                  Chaque entreprise, chaque créateur, chaque porteur de projet devrait pouvoir concentrer son énergie sur son activité plutôt que sur la recherche de financements.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20">
                <h3 className="text-xl font-bold mb-4">Pour l'économie</h3>
                <p className="opacity-90 leading-relaxed">
                  Les aides publiques existent pour soutenir l'innovation, la croissance et la résilience économique. Elles ne doivent pas rester inutilisées.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20">
                <h3 className="text-xl font-bold mb-4">Pour demain</h3>
                <p className="opacity-90 leading-relaxed">
                  Un territoire dynamique nécessite que chaque acteur – entreprise, association, collectivité – dispose des moyens de ses ambitions.
                </p>
              </div>
            </div>
            <div className="mt-12 text-center">
              <Link
                to="/"
                className="inline-block px-8 py-4 bg-gradient-to-br from-white to-slate-100 text-blue-800 font-semibold rounded-xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
              >
                Découvrir MaSubventionPro
              </Link>
            </div>
          </div>
        </section>

        {/* Footer - Same as Landing Page */}
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
                  dpo@masubventionpro.com
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
      </div>
    </>
  );
}
