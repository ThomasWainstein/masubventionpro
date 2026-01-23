import { Lock, TrendingUp, RefreshCw, Building2, Eye, EyeOff } from "lucide-react"

/**
 * Demo page showing different options for displaying subsidies without revealing full details
 */
const SubsidyDisplayDemo = () => {
  // Sample data
  const subsidies = [
    { title: "Etre accompagné dans l'investissement de vos réseaux de chaleur ou de froid, alimentés par des énergies renouvelables", type: "Subvention", agency: "ADEME", category: "Énergie" },
    { title: "Diagnostic déchets pour optimiser la gestion des déchets de votre entreprise", type: "Accompagnement", agency: "CCI France", category: "Environnement" },
    { title: "Aide aux points de recharge ouvert à tout public pour les professionnels des services de l'automobile", type: "Subvention", agency: "ADEME", category: "Mobilité" },
    { title: "Financement de la transition numérique des PME industrielles", type: "Subvention", agency: "BPI France", category: "Numérique" },
    { title: "Garantie bancaire pour le développement à l'international", type: "Prêt", agency: "BPI France", category: "International" },
  ]

  // Helper: truncate to N words
  const truncateWords = (text: string, wordCount: number) => {
    const words = text.split(' ')
    if (words.length <= wordCount) return text
    return words.slice(0, wordCount).join(' ') + '...'
  }

  // Helper: blur middle of text
  const blurMiddle = (text: string) => {
    const words = text.split(' ')
    if (words.length <= 6) return text
    const start = words.slice(0, 3).join(' ')
    const end = words.slice(-2).join(' ')
    return `${start} ████████████ ${end}`
  }

  // Helper: generate generic description
  const genericDescriptions: Record<string, string> = {
    "Énergie": "Subvention transition énergétique",
    "Environnement": "Accompagnement gestion déchets",
    "Mobilité": "Aide mobilité durable",
    "Numérique": "Subvention transformation digitale",
    "International": "Garantie développement export",
  }

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Options d'affichage des aides</h1>
        <p className="text-slate-500 mb-12">Comparaison des différentes approches pour montrer les aides sans les révéler complètement</p>

        <div className="grid gap-8">

          {/* OPTION 1: Truncated titles */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">Option 1</span>
              <h2 className="text-xl font-bold text-slate-900">Titres tronqués (5-6 mots)</h2>
            </div>
            <p className="text-slate-500 text-sm mb-4">Montre le début du titre pour donner une idée sans tout révéler</p>

            <div className="space-y-3">
              {subsidies.slice(0, 3).map((s, i) => (
                <div key={i} className="border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-bold text-slate-900 mb-1">{truncateWords(s.title, 6)}</h5>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {s.type}
                        </span>
                        <span>{s.agency}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs text-slate-400">
                        <Lock className="w-3 h-3" />
                        <span>Montant</span>
                      </div>
                      <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs">
                        <RefreshCw className="w-3 h-3" />
                        <span>Permanent</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OPTION 2: Category-based summary */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-bold">Option 2</span>
              <h2 className="text-xl font-bold text-slate-900">Résumé par catégorie (pas de titres)</h2>
            </div>
            <p className="text-slate-500 text-sm mb-4">Agrège les aides par type/source sans montrer les détails individuels</p>

            <div className="space-y-3">
              <div className="border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">3 Subventions ADEME disponibles</h5>
                      <p className="text-sm text-slate-500">Transition énergétique, mobilité, environnement</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-lg text-sm text-slate-500">
                    <Lock className="w-4 h-4" />
                    <span>Voir détails</span>
                  </div>
                </div>
              </div>
              <div className="border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">2 Accompagnements CCI France</h5>
                      <p className="text-sm text-slate-500">Gestion, diagnostic, conseil</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-lg text-sm text-slate-500">
                    <Lock className="w-4 h-4" />
                    <span>Voir détails</span>
                  </div>
                </div>
              </div>
              <div className="border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">1 Aide régionale Île-de-France</h5>
                      <p className="text-sm text-slate-500">Développement économique local</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-lg text-sm text-slate-500">
                    <Lock className="w-4 h-4" />
                    <span>Voir détails</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* OPTION 3: Blur/mask part of title */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">Option 3</span>
              <h2 className="text-xl font-bold text-slate-900">Titres partiellement masqués</h2>
            </div>
            <p className="text-slate-500 text-sm mb-4">Montre le début et la fin, masque le milieu</p>

            <div className="space-y-3">
              {subsidies.slice(0, 3).map((s, i) => (
                <div key={i} className="border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-bold text-slate-900 mb-1">
                        {blurMiddle(s.title)}
                      </h5>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {s.type}
                        </span>
                        <span>{s.agency}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-xs">
                      <Eye className="w-3 h-3" />
                      <span>Révéler</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OPTION 4: Generic descriptions only */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-bold">Option 4</span>
              <h2 className="text-xl font-bold text-slate-900">Descriptions génériques</h2>
            </div>
            <p className="text-slate-500 text-sm mb-4">Remplace les vrais titres par des descriptions de catégorie</p>

            <div className="space-y-3">
              {subsidies.slice(0, 3).map((s, i) => (
                <div key={i} className="border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-bold text-slate-900 mb-1">
                        {genericDescriptions[s.category] || s.type + " " + s.category.toLowerCase()}
                      </h5>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {s.type}
                        </span>
                        <span>{s.agency}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{s.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs text-slate-400">
                      <EyeOff className="w-3 h-3" />
                      <span>Titre masqué</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OPTION 5: Counts by type + amount range */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-sm font-bold">Option 5</span>
              <h2 className="text-xl font-bold text-slate-900">Comptage par type + fourchette</h2>
            </div>
            <p className="text-slate-500 text-sm mb-4">Montre uniquement les totaux par catégorie avec les montants potentiels</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-2 border-slate-200 rounded-xl p-5 text-center hover:border-blue-300 transition-colors">
                <div className="text-4xl font-extrabold text-blue-600 mb-1">6</div>
                <div className="font-bold text-slate-900 mb-2">Subventions</div>
                <div className="text-sm text-slate-500 mb-3">1 700 - 50 000 €</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">ADEME</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">BPI</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">Région</span>
                </div>
              </div>
              <div className="border-2 border-slate-200 rounded-xl p-5 text-center hover:border-blue-300 transition-colors">
                <div className="text-4xl font-extrabold text-amber-600 mb-1">4</div>
                <div className="font-bold text-slate-900 mb-2">Accompagnements</div>
                <div className="text-sm text-slate-500 mb-3">Gratuit</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">CCI</span>
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">CMA</span>
                </div>
              </div>
              <div className="border-2 border-slate-200 rounded-xl p-5 text-center hover:border-blue-300 transition-colors">
                <div className="text-4xl font-extrabold text-emerald-600 mb-1">5</div>
                <div className="font-bold text-slate-900 mb-2">Prêts & Garanties</div>
                <div className="text-sm text-slate-500 mb-3">jusqu'à 75 000 €</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs">BPI France</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-xl text-center">
              <p className="text-slate-600 font-medium">15 aides identifiées au total</p>
              <p className="text-slate-400 text-sm">Débloquez l'accès pour voir les détails de chaque aide</p>
            </div>
          </div>

        </div>

        {/* Summary comparison */}
        <div className="mt-12 bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-6">Récapitulatif</h2>
          <div className="grid md:grid-cols-5 gap-4 text-sm">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="font-bold mb-2">Option 1</div>
              <div className="text-white/80">Teasing léger, montre l'essentiel</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="font-bold mb-2">Option 2</div>
              <div className="text-white/80">Très protégé, vue agrégée</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="font-bold mb-2">Option 3</div>
              <div className="text-white/80">Mystérieux, incite à cliquer</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="font-bold mb-2">Option 4</div>
              <div className="text-white/80">Clair mais anonymisé</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="font-bold mb-2">Option 5</div>
              <div className="text-white/80">Dashboard, focus sur les chiffres</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default SubsidyDisplayDemo
