import { useState } from "react"
import { Helmet } from "react-helmet-async"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Loader2, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react"

const LoginPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Email ou mot de passe incorrect")
        } else if (signInError.message.includes("Email not confirmed")) {
          // Redirect to email confirmation page
          navigate(`/confirm-email?email=${encodeURIComponent(email)}`)
          return
        } else {
          setError(signInError.message)
        }
        return
      }

      if (data.user) {
        // Check if user belongs to this platform
        const userSource = data.user.user_metadata?.source

        if (userSource && userSource !== "masubventionpro") {
          // User registered on different platform - sign them out and show error
          await supabase.auth.signOut()
          setError(
            "Ce compte est associe a subvention360.com. " +
            "Veuillez vous connecter sur subvention360.com ou creer un nouveau compte ici."
          )
          return
        }

        // Redirect to dashboard/app
        navigate("/app")
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Veuillez entrer votre email pour reinitialiser votre mot de passe")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setError(null)
        alert("Un email de reinitialisation a ete envoye a " + email)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 flex items-center justify-center relative">
      <Helmet>
        <title>Connexion - MaSubventionPro</title>
      </Helmet>

      {/* Back Arrow */}
      <Link
        to="/"
        className="absolute top-6 left-6 text-white/70 hover:text-white transition-colors flex items-center gap-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Retour</span>
      </Link>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
              MaSubventionPro
            </div>
          </Link>
          <p className="text-slate-400">Connectez-vous a votre espace</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="mb-1 block">Email</Label>
              <Input
                type="email"
                placeholder="contact@entreprise.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>Mot de passe</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Mot de passe oublie ?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Pas encore de compte ?{" "}
            <Link to="/signup" className="text-blue-600 hover:underline font-medium">
              Creer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
