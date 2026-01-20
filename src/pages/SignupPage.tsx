import { useState } from "react"
import { Helmet } from "react-helmet-async"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react"

/**
 * MaSubventionPro Signup Page
 * Uses the same Supabase Auth as subvention360.com
 */
const SignupPage = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Create user account with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: companyName,
            source: "masubventionpro",
            user_type: "professional",
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.user) {
        setSuccess(true)
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      if (err.message.includes("already registered")) {
        setError("Cet email est deja utilise. Connectez-vous ou utilisez un autre email.")
      } else {
        setError(err.message || "Une erreur est survenue. Veuillez reessayer.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <Helmet>
          <title>Inscription reussie - MaSubventionPro</title>
        </Helmet>

        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Inscription reussie !
          </h1>
          <p className="text-slate-600 mb-6">
            Un email de confirmation vous a ete envoye a <strong>{email}</strong>.
            Veuillez cliquer sur le lien pour activer votre compte.
          </p>
          <Link to="/">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Retour a l'accueil
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <Helmet>
        <title>Inscription - MaSubventionPro</title>
        <meta
          name="description"
          content="Creez votre compte MaSubventionPro et accedez a plus de 5 000 aides publiques pour vos clients."
        />
      </Helmet>

      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Retour a l'accueil
        </Link>

        <div className="text-center mb-8">
          <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-800 to-emerald-600 bg-clip-text text-transparent mb-2">
            MaSubventionPro
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Creez votre compte
          </h1>
          <p className="text-slate-600 mt-2">
            Essai gratuit de 14 jours, sans engagement
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <Label className="mb-1 block">Nom de l'entreprise</Label>
            <Input
              type="text"
              placeholder="Cabinet Dupont & Associes"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label className="mb-1 block">Email professionnel</Label>
            <Input
              type="email"
              placeholder="contact@cabinet.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label className="mb-1 block">Mot de passe</Label>
            <Input
              type="password"
              placeholder="Minimum 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-6 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creation en cours...
              </>
            ) : (
              "Creer mon compte"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Deja inscrit ?{" "}
          <a
            href="https://subvention360.com/auth"
            className="text-blue-600 hover:underline font-medium"
          >
            Se connecter
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-400 text-center">
          En creant un compte, vous acceptez nos{" "}
          <a
            href="https://subvention360.com/terms"
            className="underline hover:text-slate-600"
          >
            conditions d'utilisation
          </a>{" "}
          et notre{" "}
          <a
            href="https://subvention360.com/privacy"
            className="underline hover:text-slate-600"
          >
            politique de confidentialite
          </a>
          .
        </p>
      </div>
    </div>
  )
}

export default SignupPage
