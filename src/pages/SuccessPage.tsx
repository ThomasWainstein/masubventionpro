import { useEffect, useState } from "react"
import { Helmet } from "react-helmet-async"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { CheckCircle, Clock, Mail, ArrowRight, Loader2 } from "lucide-react"

const SuccessPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = searchParams.get("session_id")
  const isPending = searchParams.get("pending") === "true"
  const [isVerifying, setIsVerifying] = useState(!!sessionId)
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setIsVerifying(false)
        return
      }

      try {
        // Call Edge Function to verify payment
        const { data, error } = await supabase.functions.invoke(
          "verify-checkout-session",
          {
            body: { sessionId },
          }
        )

        if (error) {
          console.error("Verification error:", error)
        } else if (data?.success) {
          setPaymentVerified(true)
          setUserEmail(data.email)
        }
      } catch (err) {
        console.error("Failed to verify payment:", err)
      } finally {
        setIsVerifying(false)
      }
    }

    verifyPayment()
  }, [sessionId])

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setIsAuthenticated(true)
        setUserEmail(session.user.email || null)
      }
    }
    checkAuth()
  }, [])

  // Handler to go to dashboard or email confirmation
  const handleContinue = () => {
    if (isAuthenticated) {
      navigate("/app")
    } else if (userEmail) {
      navigate(`/confirm-email?email=${encodeURIComponent(userEmail)}`)
    } else {
      navigate("/login")
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Vérification du paiement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <Helmet>
        <title>
          {isPending ? "Inscription en cours" : "Bienvenue"} - MaSubventionPro
        </title>
      </Helmet>

      <div className="max-w-xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              MaSubventionPro
            </div>
          </Link>
        </div>

        {/* Success Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          {isPending ? (
            <>
              {/* Pending Payment State */}
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                Compte créé avec succès !
              </h1>
              <p className="text-slate-600 mb-6">
                Votre compte a été créé. Pour activer toutes les fonctionnalités,
                veuillez finaliser votre paiement.
              </p>
              <Button className="w-full" asChild>
                <Link to="/login">
                  Finaliser le paiement
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                Bienvenue chez MaSubventionPro !
              </h1>
              <p className="text-slate-600 mb-6">
                {paymentVerified
                  ? "Votre paiement a été confirmé et votre compte est actif."
                  : "Votre inscription est complète. Vous pouvez maintenant accéder à toutes les fonctionnalités."}
              </p>

              {/* Email confirmation notice - only show if not fully authenticated */}
              {!isAuthenticated && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-blue-900">
                        Confirmez votre email
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Un email avec un code de vérification a été envoyé
                        {userEmail && (
                          <span className="font-medium"> à {userEmail}</span>
                        )}
                        . Entrez ce code lors de votre connexion pour activer votre compte.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ready to go message if authenticated */}
              {isAuthenticated && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-emerald-900">
                        Votre compte est prêt !
                      </p>
                      <p className="text-sm text-emerald-700 mt-1">
                        Vous pouvez maintenant accéder à votre tableau de bord et commencer à rechercher des subventions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Next steps */}
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-slate-900 text-left">
                  Prochaines étapes :
                </h3>
                <ul className="text-left text-sm text-slate-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    Confirmez votre email avec le code reçu
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    Complétez votre profil entreprise
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    Lancez votre première recherche de subventions
                  </li>
                </ul>
              </div>

              <Button className="w-full" onClick={handleContinue}>
                {isAuthenticated ? "Accéder à mon tableau de bord" : "Confirmer mon email"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </>
          )}

          {/* Support link */}
          <p className="mt-6 text-sm text-slate-500">
            Une question ?{" "}
            <a
              href="mailto:support@masubventionpro.com"
              className="text-blue-600 hover:underline"
            >
              Contactez notre support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SuccessPage
