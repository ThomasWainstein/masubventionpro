import { useState } from "react"
import { Helmet } from "react-helmet-async"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  Mail,
  User,
  Building2,
  CreditCard,
} from "lucide-react"

interface OnboardingData {
  email: string
  password: string
  firstName: string
  lastName: string
  companyName: string
  selectedPlan: "decouverte" | "business" | "premium" | null
}

const STEPS = [
  { id: 1, name: "Compte", icon: Mail },
  { id: 2, name: "Identite", icon: User },
  { id: 3, name: "Entreprise", icon: Building2 },
  { id: 4, name: "Offre", icon: CreditCard },
]

const pricingPlans = [
  {
    id: "decouverte" as const,
    name: "Decouverte",
    subtitle: "Pour tester",
    price: 49,
    period: " HT",
    periodDetail: "30 jours",
    features: [
      "1 societe",
      "Acces complet 30 jours",
      "Base complete des aides",
      "Filtres par region/secteur",
      "Export PDF",
    ],
    featured: false,
  },
  {
    id: "business" as const,
    name: "Business",
    subtitle: "Le choix des PME",
    price: 189,
    period: " HT/an",
    periodDetail: "15,75€/mois",
    addon: "+ 99€ par societe supplementaire",
    features: [
      "1 societe incluse",
      "Recherches illimitees",
      "Matching IA avance",
      "Rapports personnalises",
      "Alertes nouveaux dispositifs",
      "Support email prioritaire",
    ],
    featured: true,
    badge: "RECOMMANDE",
  },
  {
    id: "premium" as const,
    name: "Premium Groupe",
    subtitle: "Pour les groupes & cabinets",
    price: 549,
    period: " HT/an",
    periodDetail: "45,75€/mois",
    addon: "+ 99€ par pack de 5 societes",
    features: [
      "5 societes incluses",
      "Recherches illimitees",
      "Assistant IA contextuel",
      "Rapports white-label",
      "Accompagnement expert dedie",
      "Support prioritaire 24h",
    ],
    featured: false,
  },
]

const OnboardingWizard = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState<OnboardingData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    companyName: "",
    selectedPlan: null,
  })

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
    setError(null)
  }

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!data.email || !data.password) {
          setError("Veuillez remplir tous les champs")
          return false
        }
        if (data.password.length < 8) {
          setError("Le mot de passe doit contenir au moins 8 caracteres")
          return false
        }
        return true
      case 2:
        if (!data.firstName || !data.lastName) {
          setError("Veuillez remplir votre nom et prenom")
          return false
        }
        return true
      case 3:
        if (!data.companyName) {
          setError("Veuillez indiquer le nom de votre entreprise ou projet")
          return false
        }
        return true
      case 4:
        if (!data.selectedPlan) {
          setError("Veuillez choisir une offre")
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleNext = async () => {
    if (!validateStep()) return

    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1)
    } else {
      // Final step - create account and redirect to Stripe
      await handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            company_name: data.companyName,
            selected_plan: data.selectedPlan,
            source: "masubventionpro",
          },
        },
      })

      if (signUpError) throw signUpError

      if (!authData.user) {
        throw new Error("Erreur lors de la creation du compte")
      }

      // 2. Create Stripe checkout session via MSP Edge Function
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        "msp-create-checkout",
        {
          body: {
            planType: data.selectedPlan,
            userId: authData.user.id,
            email: data.email,
            addonCompanies: 0, // Can be increased for extra companies
          },
        }
      )

      if (checkoutError) {
        console.error("Checkout error:", checkoutError)
        // If checkout fails, still redirect to success with pending payment
        navigate("/success?pending=true")
        return
      }

      // 3. Redirect to Stripe Checkout
      if (checkoutData?.url) {
        window.location.href = checkoutData.url
      } else {
        // Fallback - account created, payment pending
        navigate("/success?pending=true")
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      if (err.message?.includes("already registered")) {
        setError("Cet email est deja utilise. Connectez-vous ou utilisez un autre email.")
      } else {
        setError(err.message || "Une erreur est survenue. Veuillez reessayer.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4">
      <Helmet>
        <title>Inscription - MaSubventionPro</title>
      </Helmet>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/">
            <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
              MaSubventionPro
            </div>
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    currentStep > step.id
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : currentStep === step.id
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-transparent border-slate-500 text-slate-500"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      currentStep > step.id ? "bg-emerald-500" : "bg-slate-600"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          {/* Step 1: Email/Password */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">Creez votre compte</h2>
                <p className="text-slate-600 mt-2">Commencez par vos identifiants de connexion</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="mb-1 block">Email professionnel</Label>
                  <Input
                    type="email"
                    placeholder="contact@entreprise.fr"
                    value={data.email}
                    onChange={(e) => updateData({ email: e.target.value })}
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Mot de passe</Label>
                  <Input
                    type="password"
                    placeholder="Minimum 8 caracteres"
                    value={data.password}
                    onChange={(e) => updateData({ password: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Name */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">Vos informations</h2>
                <p className="text-slate-600 mt-2">Comment devons-nous vous appeler ?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="mb-1 block">Prenom</Label>
                  <Input
                    type="text"
                    placeholder="Jean"
                    value={data.firstName}
                    onChange={(e) => updateData({ firstName: e.target.value })}
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Nom</Label>
                  <Input
                    type="text"
                    placeholder="Dupont"
                    value={data.lastName}
                    onChange={(e) => updateData({ lastName: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Company */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">Votre entreprise</h2>
                <p className="text-slate-600 mt-2">
                  Le nom de votre entreprise ou de votre projet
                </p>
              </div>

              <div>
                <Label className="mb-1 block">Nom de l'entreprise ou du projet</Label>
                <Input
                  type="text"
                  placeholder="Ma Startup SAS"
                  value={data.companyName}
                  onChange={(e) => updateData({ companyName: e.target.value })}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 4: Plan Selection */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">Choisissez votre offre</h2>
                <p className="text-slate-600 mt-2">Abonnement annuel, paiement unique</p>
              </div>

              <div className="grid gap-4">
                {pricingPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => updateData({ selectedPlan: plan.id })}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      data.selectedPlan === plan.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-2 right-4 bg-amber-500 text-white px-3 py-0.5 rounded-full text-xs font-bold">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">{plan.name}</h3>
                        <p className="text-sm text-slate-500">{plan.subtitle}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-blue-800">
                          {plan.price}€
                        </span>
                        <span className="text-slate-500 text-sm">{plan.period}</span>
                        {plan.periodDetail && (
                          <p className="text-xs text-slate-400">{plan.periodDetail}</p>
                        )}
                      </div>
                    </div>
                    {plan.addon && (
                      <p className="mt-1 text-xs text-blue-600">{plan.addon}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {plan.features.slice(0, 3).map((feature, i) => (
                        <span
                          key={i}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded"
                        >
                          {feature}
                        </span>
                      ))}
                      {plan.features.length > 3 && (
                        <span className="text-xs text-slate-400">
                          +{plan.features.length - 3} autres
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? () => navigate("/") : handleBack}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              {currentStep === 1 ? "Retour" : "Precedent"}
            </Button>

            <Button onClick={handleNext} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : currentStep === 4 ? (
                <>
                  Payer {data.selectedPlan && pricingPlans.find((p) => p.id === data.selectedPlan)?.price}€
                  <CreditCard className="ml-2 w-4 h-4" />
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {/* Already have account */}
          <div className="mt-6 text-center text-sm text-slate-500">
            Deja inscrit ?{" "}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingWizard
